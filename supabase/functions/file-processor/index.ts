import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FileProcessingPayload {
  action: 'upload' | 'process' | 'compress' | 'generate_thumbnail' | 'extract_metadata'
  file_path: string
  file_name: string
  file_size: number
  mime_type: string
  user_id: string
  organization_id: string
  options?: {
    compress_quality?: number
    thumbnail_size?: number
    extract_text?: boolean
    watermark?: boolean
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const payload: FileProcessingPayload = await req.json()
    console.log('Processing file:', payload)

    let result: any = {}

    switch (payload.action) {
      case 'upload':
        result = await handleFileUpload(supabaseClient, payload)
        break
        
      case 'process':
        result = await processFile(supabaseClient, payload)
        break
        
      case 'compress':
        result = await compressFile(supabaseClient, payload)
        break
        
      case 'generate_thumbnail':
        result = await generateThumbnail(supabaseClient, payload)
        break
        
      case 'extract_metadata':
        result = await extractMetadata(supabaseClient, payload)
        break
        
      default:
        throw new Error(`Unknown action: ${payload.action}`)
    }

    // Log file processing activity
    await logFileActivity(supabaseClient, payload, result)

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: result,
        action: payload.action,
        file_name: payload.file_name
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error processing file:', error)
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})

async function handleFileUpload(supabaseClient: any, payload: FileProcessingPayload) {
  console.log('Handling file upload:', payload.file_name)

  // Validate file type and size
  const validation = validateFile(payload)
  if (!validation.valid) {
    throw new Error(validation.error)
  }

  // Get file from storage
  const { data: fileData, error: downloadError } = await supabaseClient.storage
    .from('uploads')
    .download(payload.file_path)

  if (downloadError) {
    throw new Error(`Failed to download file: ${downloadError.message}`)
  }

  // Scan for viruses/malware (in production, integrate with a service like VirusTotal)
  const scanResult = await scanFile(fileData)
  if (!scanResult.safe) {
    // Move to quarantine and alert admins
    await quarantineFile(supabaseClient, payload)
    throw new Error('File failed security scan')
  }

  // Extract basic metadata
  const metadata = await extractBasicMetadata(fileData, payload)

  // Save file record to database
  const { data: fileRecord, error: dbError } = await supabaseClient
    .from('files')
    .insert({
      file_name: payload.file_name,
      file_path: payload.file_path,
      file_size: payload.file_size,
      mime_type: payload.mime_type,
      user_id: payload.user_id,
      organization_id: payload.organization_id,
      metadata: metadata,
      status: 'uploaded',
      is_processed: false,
      scan_status: 'clean'
    })
    .select()
    .single()

  if (dbError) {
    throw new Error(`Failed to save file record: ${dbError.message}`)
  }

  // Generate thumbnail for images
  if (payload.mime_type.startsWith('image/')) {
    await generateThumbnail(supabaseClient, payload)
  }

  // Process document for text extraction
  if (isDocumentType(payload.mime_type)) {
    await extractDocumentText(supabaseClient, payload)
  }

  return {
    file_id: fileRecord.id,
    status: 'uploaded',
    metadata: metadata,
    processing_queued: true
  }
}

async function processFile(supabaseClient: any, payload: FileProcessingPayload) {
  console.log('Processing file:', payload.file_name)

  const results: any = {
    processed: true,
    operations: []
  }

  // Get file data
  const { data: fileData, error } = await supabaseClient.storage
    .from('uploads')
    .download(payload.file_path)

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`)
  }

  // Determine processing operations based on file type
  const operations = determineProcessingOperations(payload)

  for (const operation of operations) {
    try {
      let operationResult: any

      switch (operation) {
        case 'compress':
          operationResult = await compressFile(supabaseClient, payload)
          break
          
        case 'thumbnail':
          operationResult = await generateThumbnail(supabaseClient, payload)
          break
          
        case 'extract_text':
          operationResult = await extractDocumentText(supabaseClient, payload)
          break
          
        case 'optimize':
          operationResult = await optimizeFile(supabaseClient, payload)
          break
          
        case 'watermark':
          if (payload.options?.watermark) {
            operationResult = await addWatermark(supabaseClient, payload)
          }
          break
      }

      results.operations.push({
        operation,
        success: true,
        result: operationResult
      })

    } catch (error) {
      console.error(`Failed operation ${operation}:`, error)
      results.operations.push({
        operation,
        success: false,
        error: error.message
      })
    }
  }

  // Update file status
  await supabaseClient
    .from('files')
    .update({
      is_processed: true,
      processed_at: new Date().toISOString(),
      processing_results: results
    })
    .eq('file_path', payload.file_path)

  return results
}

async function compressFile(supabaseClient: any, payload: FileProcessingPayload) {
  console.log('Compressing file:', payload.file_name)

  if (!payload.mime_type.startsWith('image/')) {
    return { message: 'Compression only available for images' }
  }

  // Get original file
  const { data: originalFile, error } = await supabaseClient.storage
    .from('uploads')
    .download(payload.file_path)

  if (error) {
    throw new Error(`Failed to download original file: ${error.message}`)
  }

  // In production, use image processing library like Sharp
  // For now, simulate compression
  const compressedData = await simulateImageCompression(originalFile, payload.options?.compress_quality || 80)

  // Upload compressed version
  const compressedPath = payload.file_path.replace(/(\.[^.]+)$/, '_compressed$1')
  const { error: uploadError } = await supabaseClient.storage
    .from('uploads')
    .upload(compressedPath, compressedData, {
      contentType: payload.mime_type,
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Failed to upload compressed file: ${uploadError.message}`)
  }

  return {
    compressed_path: compressedPath,
    original_size: payload.file_size,
    compressed_size: compressedData.size,
    compression_ratio: ((payload.file_size - compressedData.size) / payload.file_size * 100).toFixed(2) + '%'
  }
}

async function generateThumbnail(supabaseClient: any, payload: FileProcessingPayload) {
  console.log('Generating thumbnail for:', payload.file_name)

  if (!payload.mime_type.startsWith('image/')) {
    return { message: 'Thumbnails only available for images' }
  }

  // Get original file
  const { data: originalFile, error } = await supabaseClient.storage
    .from('uploads')
    .download(payload.file_path)

  if (error) {
    throw new Error(`Failed to download file for thumbnail: ${error.message}`)
  }

  // Generate thumbnail (simulate for now)
  const thumbnailData = await simulateThumbnailGeneration(originalFile, payload.options?.thumbnail_size || 200)

  // Upload thumbnail
  const thumbnailPath = payload.file_path.replace(/(\.[^.]+)$/, '_thumb$1')
  const { error: uploadError } = await supabaseClient.storage
    .from('uploads')
    .upload(thumbnailPath, thumbnailData, {
      contentType: payload.mime_type,
      upsert: true
    })

  if (uploadError) {
    throw new Error(`Failed to upload thumbnail: ${uploadError.message}`)
  }

  // Update file record with thumbnail path
  await supabaseClient
    .from('files')
    .update({ thumbnail_path: thumbnailPath })
    .eq('file_path', payload.file_path)

  return {
    thumbnail_path: thumbnailPath,
    thumbnail_size: thumbnailData.size
  }
}

async function extractMetadata(supabaseClient: any, payload: FileProcessingPayload) {
  console.log('Extracting metadata for:', payload.file_name)

  // Get file
  const { data: fileData, error } = await supabaseClient.storage
    .from('uploads')
    .download(payload.file_path)

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`)
  }

  let metadata: any = {
    file_name: payload.file_name,
    file_size: payload.file_size,
    mime_type: payload.mime_type,
    extracted_at: new Date().toISOString()
  }

  // Extract type-specific metadata
  if (payload.mime_type.startsWith('image/')) {
    metadata = { ...metadata, ...(await extractImageMetadata(fileData)) }
  } else if (payload.mime_type.startsWith('video/')) {
    metadata = { ...metadata, ...(await extractVideoMetadata(fileData)) }
  } else if (payload.mime_type.startsWith('audio/')) {
    metadata = { ...metadata, ...(await extractAudioMetadata(fileData)) }
  } else if (isDocumentType(payload.mime_type)) {
    metadata = { ...metadata, ...(await extractDocumentMetadata(fileData)) }
  }

  // Update file record with extracted metadata
  await supabaseClient
    .from('files')
    .update({ 
      metadata: metadata,
      metadata_extracted: true 
    })
    .eq('file_path', payload.file_path)

  return metadata
}

async function extractDocumentText(supabaseClient: any, payload: FileProcessingPayload) {
  console.log('Extracting text from document:', payload.file_name)

  if (!isDocumentType(payload.mime_type)) {
    return { message: 'Text extraction only available for documents' }
  }

  // Get file
  const { data: fileData, error } = await supabaseClient.storage
    .from('uploads')
    .download(payload.file_path)

  if (error) {
    throw new Error(`Failed to download file: ${error.message}`)
  }

  // Extract text based on document type
  let extractedText = ''
  
  switch (payload.mime_type) {
    case 'application/pdf':
      extractedText = await extractPDFText(fileData)
      break
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    case 'application/msword':
      extractedText = await extractWordText(fileData)
      break
    case 'text/plain':
      extractedText = await fileData.text()
      break
    default:
      extractedText = 'Text extraction not supported for this document type'
  }

  // Save extracted text
  const { error: textError } = await supabaseClient
    .from('file_text_content')
    .upsert({
      file_path: payload.file_path,
      extracted_text: extractedText,
      word_count: extractedText.split(/\s+/).length,
      extracted_at: new Date().toISOString()
    })

  if (textError) {
    console.error('Failed to save extracted text:', textError)
  }

  return {
    text_extracted: true,
    word_count: extractedText.split(/\s+/).length,
    preview: extractedText.substring(0, 500) + (extractedText.length > 500 ? '...' : '')
  }
}

// Helper functions

function validateFile(payload: FileProcessingPayload): { valid: boolean; error?: string } {
  const maxSize = 100 * 1024 * 1024 // 100MB
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime',
    'audio/mpeg', 'audio/wav',
    'application/pdf', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain', 'text/csv'
  ]

  if (payload.file_size > maxSize) {
    return { valid: false, error: 'File size exceeds maximum limit of 100MB' }
  }

  if (!allowedTypes.includes(payload.mime_type)) {
    return { valid: false, error: `File type ${payload.mime_type} is not allowed` }
  }

  return { valid: true }
}

async function scanFile(fileData: any): Promise<{ safe: boolean; threats?: string[] }> {
  // Simulate virus scanning - in production, integrate with actual antivirus service
  console.log('Scanning file for threats...')
  
  // Simple checks for demonstration
  const fileText = await fileData.text().catch(() => '')
  const suspiciousPatterns = ['<script>', 'eval(', 'document.write']
  
  const threats = suspiciousPatterns.filter(pattern => fileText.includes(pattern))
  
  return {
    safe: threats.length === 0,
    threats: threats.length > 0 ? threats : undefined
  }
}

async function quarantineFile(supabaseClient: any, payload: FileProcessingPayload) {
  // Move file to quarantine bucket
  const { error } = await supabaseClient.storage
    .from('quarantine')
    .move(payload.file_path, `quarantined/${payload.file_name}`)

  if (error) {
    console.error('Failed to quarantine file:', error)
  }

  // Log security incident
  await supabaseClient
    .from('security_incidents')
    .insert({
      incident_type: 'malicious_file_upload',
      file_path: payload.file_path,
      user_id: payload.user_id,
      organization_id: payload.organization_id,
      details: 'File failed security scan and was quarantined',
      severity: 'high'
    })
}

async function extractBasicMetadata(fileData: any, payload: FileProcessingPayload) {
  return {
    upload_timestamp: new Date().toISOString(),
    file_size_mb: (payload.file_size / (1024 * 1024)).toFixed(2),
    content_type: payload.mime_type,
    file_extension: payload.file_name.split('.').pop()?.toLowerCase()
  }
}

function isDocumentType(mimeType: string): boolean {
  const documentTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'text/plain',
    'text/csv'
  ]
  return documentTypes.includes(mimeType)
}

function determineProcessingOperations(payload: FileProcessingPayload): string[] {
  const operations = []

  if (payload.mime_type.startsWith('image/')) {
    operations.push('thumbnail', 'compress')
    if (payload.options?.watermark) {
      operations.push('watermark')
    }
  }

  if (isDocumentType(payload.mime_type)) {
    operations.push('extract_text')
  }

  if (payload.mime_type.startsWith('video/') || payload.mime_type.startsWith('audio/')) {
    operations.push('optimize')
  }

  return operations
}

// Simulation functions (replace with actual implementations)

async function simulateImageCompression(fileData: any, quality: number): Promise<any> {
  // Simulate compression by reducing file size
  const originalSize = fileData.size || 1000000
  const compressedSize = Math.floor(originalSize * (quality / 100))
  
  return {
    ...fileData,
    size: compressedSize
  }
}

async function simulateThumbnailGeneration(fileData: any, size: number): Promise<any> {
  // Simulate thumbnail generation
  return {
    ...fileData,
    size: Math.floor((fileData.size || 1000000) * 0.1) // 10% of original size
  }
}

async function extractImageMetadata(fileData: any) {
  // In production, use a library like exifr or sharp
  return {
    width: 1920,
    height: 1080,
    format: 'JPEG',
    color_space: 'sRGB',
    has_transparency: false
  }
}

async function extractVideoMetadata(fileData: any) {
  return {
    duration: 120, // seconds
    width: 1920,
    height: 1080,
    frame_rate: 30,
    codec: 'H.264'
  }
}

async function extractAudioMetadata(fileData: any) {
  return {
    duration: 180, // seconds
    bitrate: 320, // kbps
    sample_rate: 44100,
    channels: 2
  }
}

async function extractDocumentMetadata(fileData: any) {
  return {
    page_count: 10,
    author: 'Unknown',
    creation_date: new Date().toISOString(),
    language: 'en'
  }
}

async function extractPDFText(fileData: any): Promise<string> {
  // In production, use a PDF parsing library
  return 'Sample extracted text from PDF document...'
}

async function extractWordText(fileData: any): Promise<string> {
  // In production, use a Word document parsing library
  return 'Sample extracted text from Word document...'
}

async function optimizeFile(supabaseClient: any, payload: FileProcessingPayload) {
  // Generic file optimization
  return { optimized: true, size_reduction: '15%' }
}

async function addWatermark(supabaseClient: any, payload: FileProcessingPayload) {
  // Add watermark to image/video
  return { watermark_added: true, watermark_text: 'Celebrity Booking Platform' }
}

async function logFileActivity(supabaseClient: any, payload: FileProcessingPayload, result: any) {
  const { error } = await supabaseClient
    .from('file_processing_logs')
    .insert({
      file_path: payload.file_path,
      action: payload.action,
      user_id: payload.user_id,
      organization_id: payload.organization_id,
      success: result.success !== false,
      result: result,
      processed_at: new Date().toISOString()
    })

  if (error) {
    console.error('Failed to log file activity:', error)
  }
}