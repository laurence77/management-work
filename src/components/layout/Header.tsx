import { useState } from "react";
import { Star, Menu, X, User, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass backdrop-luxury">
      <div className="container mx-auto px-6">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="relative">
              <Star className="h-8 w-8 text-primary fill-current" />
              <div className="absolute inset-0 animate-pulse">
                <Star className="h-8 w-8 text-primary/50 fill-current" />
              </div>
            </div>
            <span className="text-2xl font-bold text-gradient-primary">
              EliteConnect
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            <Link to="/" className="text-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <Link to="/celebrities" className="text-foreground hover:text-primary transition-colors">
              Celebrities
            </Link>
            <Link to="/services" className="text-foreground hover:text-primary transition-colors">
              Services
            </Link>
            <Link to="/events" className="text-foreground hover:text-primary transition-colors">
              Events
            </Link>
            <Link to="/management" className="text-foreground hover:text-primary transition-colors">
              Management
            </Link>
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center space-x-4">
            <Button variant="ghost" size="icon" className="glass-hover">
              <Search className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" className="glass-hover">
              <User className="h-5 w-5" />
            </Button>
            <Button className="btn-luxury">
              Book Now
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden glass-hover"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className="md:hidden glass-card m-4 mt-0 animate-in slide-in-from-top duration-300">
          <nav className="flex flex-col space-y-2 p-6">
            <Link 
              to="/" 
              className="text-foreground hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/5 active:bg-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              Home
            </Link>
            <Link 
              to="/celebrities" 
              className="text-foreground hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/5 active:bg-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              Celebrities
            </Link>
            <Link 
              to="/services" 
              className="text-foreground hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/5 active:bg-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              Services
            </Link>
            <Link 
              to="/events" 
              className="text-foreground hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/5 active:bg-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              Events
            </Link>
            <Link 
              to="/management" 
              className="text-foreground hover:text-primary transition-colors py-3 px-4 rounded-lg hover:bg-white/5 active:bg-white/10"
              onClick={() => setIsMenuOpen(false)}
            >
              Management
            </Link>
            <div className="pt-4 border-t border-white/10">
              <Button className="btn-luxury w-full h-12 text-base">
                Book Now
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
};