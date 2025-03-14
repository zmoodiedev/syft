import Hero from './components/Hero';
import Features from './components/Features';
import Callout from './components/Callout';

export default function Home() {
  return (
    <div className="home-wrap">
      <Hero />
      <Features />
      <Callout />
    </div>
  );
}
