import { getFeaturedAstrologers } from '../../services/astrologers'
import { AstrologerCard } from '../astrologers/AstrologerCard'
import { Button } from '../ui/Button'
import { Section } from '../ui/Section'

export function FeaturedAstrologers() {
  const featured = getFeaturedAstrologers()

  return (
    <Section
      id="featured"
      className="mt-16 sm:mt-20"
      eyebrow="Featured voices"
      title="Astrologers to begin with"
      description="These cards use clearly labelled sample data so the layout can later connect to live profiles without changing presentation."
    >
      <div className="grid items-stretch gap-5 sm:grid-cols-2">
        {featured.map((astrologer) => (
          <AstrologerCard key={astrologer.id} astrologer={astrologer} />
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Button to="/astrologers" variant="secondary">
          Browse all astrologers
        </Button>
      </div>
    </Section>
  )
}
