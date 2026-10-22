import { CategoryGrid } from '../components/home/CategoryGrid'
import { FeaturedAstrologers } from '../components/home/FeaturedAstrologers'
import { Hero } from '../components/home/Hero'
import { HowItWorks } from '../components/home/HowItWorks'
import { TrustSection } from '../components/home/TrustSection'

export function HomePage() {
  return (
    <>
      <Hero />
      <CategoryGrid />
      <FeaturedAstrologers />
      <HowItWorks />
      <TrustSection />
    </>
  )
}
