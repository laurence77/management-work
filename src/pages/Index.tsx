import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { Hero } from "@/components/home/Hero";
import { FeaturedCelebrities } from "@/components/home/FeaturedCelebrities";
import { ServiceCategories } from "@/components/home/ServiceCategories";
import { Testimonials } from "@/components/home/Testimonials";
import { LiveChat } from "@/components/shared/LiveChat";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Header />
      <main>
        <Hero />
        <FeaturedCelebrities />
        <ServiceCategories />
        <Testimonials />
      </main>
      <Footer />
      <LiveChat />
    </div>
  );
};

export default Index;
