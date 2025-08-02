import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { splitVendorChunkPlugin } from 'vite';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  base: './',
  server: {
    host: "0.0.0.0",
    port: 5173,
    hmr: {
      // Reduce aggressive reloading
      clientPort: 5173,
      overlay: false,
      timeout: 10000
    },
    // Optimize file watching
    watch: {
      usePolling: false,
      interval: 1000,
      binaryInterval: 1000,
      ignored: [
        '**/node_modules/**',
        '**/.git/**', 
        '**/dist/**',
        '**/coverage/**',
        '**/*.log',
        '**/backend/**'
      ]
    }
  },
  plugins: [
    react(),
    splitVendorChunkPlugin(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Use relative paths for file:// protocol compatibility
    assetsDir: '.',
    // Optimize for mobile performance
    target: ['es2020', 'chrome90', 'safari13'],
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React libraries
          if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
            return 'react-vendor';
          }
          
          // UI component libraries  
          if (id.includes('@radix-ui')) {
            return 'radix-ui';
          }
          
          // Icons and animations
          if (id.includes('lucide-react') || id.includes('framer-motion')) {
            return 'ui-assets';
          }
          
          // Form handling
          if (id.includes('react-hook-form') || id.includes('@hookform') || id.includes('zod')) {
            return 'forms';
          }
          
          // Data fetching and state
          if (id.includes('@tanstack/react-query')) {
            return 'data-management';
          }
          
          // Charts and visualization
          if (id.includes('recharts')) {
            return 'charts';
          }
          
          // Date handling
          if (id.includes('date-fns') || id.includes('react-day-picker')) {
            return 'date-utils';
          }
          
          // Utility libraries
          if (id.includes('clsx') || id.includes('tailwind-merge') || id.includes('class-variance-authority')) {
            return 'utils';
          }
        },
        
        // Optimize chunk names for caching
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
            ? chunkInfo.facadeModuleId.split('/').pop()
            : 'chunk';
          return `js/[name]-[hash].js`;
        },
        
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `img/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext)) {
            return `css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
      },
    },
    
    // Enable minification and compression
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: mode === 'production',
        drop_debugger: mode === 'production',
        pure_funcs: mode === 'production' ? ['console.log', 'console.info'] : [],
        dead_code: true,
        conditionals: true,
        evaluate: true,
        booleans: true,
        loops: true,
        unused: true,
        hoist_funs: true,
        keep_fargs: false,
        hoist_vars: false,
        if_return: true,
        join_vars: true,
        side_effects: false
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    
    // CSS optimization
    cssCodeSplit: true,
    cssMinify: true,
    
    // Source maps for production debugging
    sourcemap: mode === 'production' ? 'hidden' : true,
    
    // Enable compression
    reportCompressedSize: true
  },
  
  // CSS optimizations
  css: {
    devSourcemap: mode === 'development',
    modules: {
      localsConvention: 'camelCase'
    },
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/styles/variables.scss";'
      }
    }
  },
  
  // Advanced dependency optimization
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      'lucide-react',
      '@radix-ui/react-dialog',
      '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-select'
    ],
    exclude: [
      // Exclude large libraries that should be loaded on demand
      'recharts'
    ]
  },
  
  // Experimental features for better performance
  // experimental: {
  //   renderBuiltUrl(filename, { hostId, hostType, type }) {
  //     if (type === 'asset') {
  //       return `https://cdn.bookmyreservation.org/assets/${filename}`;
  //     }
  //   }
  // },
  
  // Worker optimization
  worker: {
    format: 'es',
    plugins: () => [
      react()
    ]
  }
}));
