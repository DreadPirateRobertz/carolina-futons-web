export interface GuideSection {
  heading: string;
  body: string;
}

export interface GuideSummary {
  slug: string;
  title: string;
  hook: string;
  readingTimeMin: number;
  sections?: readonly GuideSection[];
}

export const GUIDES: readonly GuideSummary[] = [
  {
    slug: "how-to-pick-a-futon-mattress",
    title: "How to pick a futon mattress",
    hook: "Fill types, thickness, and the tradeoff between sitting support and sleeping comfort.",
    readingTimeMin: 7,
    sections: [
      {
        heading: "The core tradeoff",
        body: "A futon mattress does two jobs that pull in opposite directions. For sitting, you want a firm, dense surface that doesn't bottom out under thigh pressure. For sleeping, you want enough give to let your shoulders and hips sink in without putting a kink in your spine. No single fill does both perfectly — the question is which direction your household leans. If the futon is mainly a sofa and guests sleep on it twice a year, bias toward firm. If someone is sleeping on it most nights, treat it like a primary mattress and choose for sleep comfort first.",
      },
      {
        heading: "Fill types explained",
        body: "Cotton batting is the traditional fill. It packs firm, holds its shape over years, and is easy to fold without cracking. The tradeoff is that it feels harder than most people expect the first few weeks and can develop a slight body impression over time. Innerspring coils, usually in a foam-encased unit, add bounce and distribute weight more evenly across the mattress — closer to a conventional mattress feel. They're heavier and don't fold quite as flat, which matters if you're converting the futon daily. Foam fills are the lightest and cheapest but compress fastest; they're best for occasional use. Hybrid constructions layer cotton batting over coils to combine the firm sitting feel of cotton with the sleeping comfort of springs — this is what we sell most to people who genuinely split usage between sitting and sleeping.",
      },
      {
        heading: "Thickness and what it means",
        body: "Futon mattresses typically run from 6 inches to 10 inches thick. A 6-inch all-cotton mattress feels firmer and folds completely flat; it's the right choice for a tri-fold frame or a futon that converts daily. An 8-inch or 10-inch hybrid feels dramatically more like a bed and is harder to fold without help — plan for that if your frame sees frequent conversions. Thickness also affects seat height. A thicker mattress on a frame with a 16-inch platform puts the sitting surface at 24 inches — close to standard sofa height. A thinner mattress on the same frame sits lower, which some people prefer and others find hard to get out of.",
      },
      {
        heading: "Firmness in practice",
        body: "Mattress firmness labels — soft, medium, firm — mean different things across manufacturers. The only reliable test is to sit on it and lie on it in the position you actually sleep in. In our showroom, we keep every mattress we sell on a floor frame so you can test it before buying. A few things that consistently surprise people: cotton fills feel much softer after 30 nights of use as the batting breaks in; foam fills feel softer immediately but lose that softness faster. If you're ordering without testing, medium is the lowest-risk choice for most sleepers. Very light sleepers (under 130 lbs) often prefer soft; heavier sleepers (over 220 lbs) often prefer firm to avoid bottoming out.",
      },
      {
        heading: "One thing most people overlook: weight",
        body: "If you're converting the futon from sofa to bed position regularly, mattress weight matters more than people realize. A 10-inch innerspring mattress can weigh 50–70 lbs. Lifting one end while managing the frame mechanism is real work. If the futon will be converted by one person, daily, an 8-inch cotton-hybrid (around 35–40 lbs) is meaningfully easier to handle. We've seen customers choose a heavier mattress for the comfort and then stop converting it at all because the process is too inconvenient.",
      },
      {
        heading: "Care and longevity",
        body: "Futon mattresses last longer if you rotate them end-to-end every three months — this evens out the body impression that forms in one sleeping zone. Cotton-fill mattresses benefit from occasional airing in sunlight, which refreshes the batting. Covers protect the mattress from oils and moisture that degrade fill over time; it's worth spending on a quality cover rather than replacing a mattress prematurely. Our frames carry a 15-year warranty, but mattresses typically last 8–12 years with proper care. The surest sign a mattress needs replacing is when the coils or batting have compressed enough that you feel the frame slats through it.",
      },
    ],
  },
  {
    slug: "full-vs-queen-futons",
    title: "Full vs queen futons",
    hook: "The size difference is 6 inches of width. Whether that matters depends on who is sleeping and how the room is laid out.",
    readingTimeMin: 5,
    sections: [
      {
        heading: "The size difference in numbers",
        body: "A full (double) futon mattress is 54 inches wide by 75 inches long. A queen is 60 inches wide by 80 inches long. That 6-inch width difference is noticeable when two adults are sleeping but barely perceptible as a sofa. The 5-inch length difference matters most for tall sleepers — anyone over 6 feet will hang off the end of a full mattress. As a sofa, the seat depth on a full (roughly 27 inches when folded) versus queen (30 inches) is a subtle comfort difference that most people don't notice until they sit on both back to back.",
      },
      {
        heading: "When full is the right choice",
        body: "A full futon is the better choice when the room is tight. A full frame in sofa position typically runs 79–82 inches wide; a queen runs 86–90 inches wide. In a 10×12 room, that extra 8 inches can be the difference between the frame fitting comfortably and forcing everything else against a wall. Full is also right when the futon is primarily a sofa. A full seat width (54 inches in bed position, about 72 inches in sofa position) seats two adults without crowding. If you never plan to sleep two adults simultaneously, a full is almost always sufficient and the room looks less consumed by furniture.",
      },
      {
        heading: "When queen is the right choice",
        body: "Choose a queen when the futon is a primary guest bed where two adults will sleep regularly. Six inches of extra width over eight hours of sleep is the difference between a comfortable night and a polite but uncomfortable one. Queen is also the right call for tall households — the 5 extra inches of length push the sleeping surface to 80 inches, enough for a 6'2\" sleeper without overhang. If your home has a dedicated guest room with 12 feet of wall space or more, a queen reads as a proper bedroom piece rather than a compromise.",
      },
      {
        heading: "Frame and mattress compatibility",
        body: "Full and queen are not interchangeable. A queen mattress on a full frame will overhang and create a tripping hazard; a full mattress on a queen frame will shift and fold unevenly. If you're replacing just the mattress, confirm the frame size before ordering. Our frames are labeled clearly, and the mattress SKU notes the compatible frame size. If you're buying a set, the mattress is included in the frame listing and sized correctly. One thing worth confirming: bi-fold versus tri-fold mattresses are not interchangeable across frame types even within the same size, so always note which fold style your frame requires.",
      },
      {
        heading: "What about twin and king?",
        body: "Twin futons (38 × 75 inches) are sized for children's rooms and narrow studio apartments. They work well as a primary bed for one person but are too narrow for two. King futon frames are uncommon — most customers wanting king-width sleeping choose a platform bed or Murphy bed instead, since a king futon in sofa position (roughly 102 inches wide) dominates any normal room. If size is the main concern, the queen-to-platform-bed comparison is often worth having before committing.",
      },
    ],
  },
  {
    slug: "murphy-bed-sizing",
    title: "Murphy bed sizing",
    hook: "Clearances, mattress depths, and the wall build-out you actually need.",
    readingTimeMin: 6,
  },
  {
    slug: "platform-bed-vs-futon",
    title: "Platform bed vs futon",
    hook: "When a daybed or platform frame beats a folding futon, and vice versa.",
    readingTimeMin: 5,
  },
  {
    slug: "room-layout-for-small-spaces",
    title: "Room layout for small spaces",
    hook: "Getting a guest room and a home office out of the same 10×12.",
    readingTimeMin: 8,
  },
  {
    slug: "mattress-firmness-guide",
    title: "Mattress firmness guide",
    hook: "What soft, medium, and firm actually mean across our mattress lineup.",
    readingTimeMin: 5,
  },
  {
    slug: "warranty-and-care",
    title: "Warranty & care",
    hook: "Our 15-year frame warranty, covering fabric, and the small habits that keep a futon going.",
    readingTimeMin: 4,
    sections: [
      {
        heading: "What the 15-year warranty covers",
        body: "Our frames are backed by a 15-year warranty against manufacturing defects under normal residential use. That covers cracked joints, failed hardware, delaminated panels, and latch mechanisms that stop engaging. We'll repair the frame, send replacement parts, or if neither is practical, replace the piece. The warranty applies to the original purchaser and requires proof of purchase — keep your order confirmation. It does not transfer with the frame if you sell it.",
      },
      {
        heading: "What it doesn't cover",
        body: "Normal wear — including fabric fading, surface scratches, and the slight darkening of hardwood that happens over years of use — is not a defect. Commercial or rental use voids the warranty, as does damage from moving or modifications not performed by us. Aesthetic variation in solid wood (grain patterns, knot character, minor color variation between pieces) is a feature of real wood furniture, not a defect, and is not covered. Mattresses carry the manufacturer's warranty from the original maker rather than ours; covers and accessories are warranted against manufacturing defects for one year.",
      },
      {
        heading: "Frame care basics",
        body: "Hardwood frames need almost no maintenance. Dust them the way you'd dust any wood furniture. If a joint develops a slight squeak, a small amount of food-grade mineral oil at the hinge point usually resolves it. Avoid leaving the frame folded in the same position for extended periods — converting between sofa and bed position occasionally keeps the joints from stiffening. For frames with a lacquer finish, use a soft cloth and avoid spray cleaners with ammonia or silicone, which can cloud the finish over time.",
      },
      {
        heading: "Mattress care that extends life",
        body: "Rotate your mattress end-to-end every three months. This shifts the body impression zone and dramatically extends the useful life of the fill. If you can, air the mattress in indirect sunlight once or twice a year — UV exposure refreshes cotton batting without the heat that can degrade foam fills. A quality futon cover protects the mattress from the body oils and moisture that gradually break down fill material. We stock covers in cotton, microfiber, and canvas; any of them extend mattress life meaningfully compared to leaving the fill exposed.",
      },
      {
        heading: "Filing a warranty claim",
        body: "Email carolinafutons@gmail.com with your order number, a description of the issue, and photos if you can. We respond within one business day and walk you through the next step — usually a parts shipment or a showroom assessment. You can also call (828) 252-9449 during showroom hours (Wednesday–Saturday, 10am–5pm). We've been at this since 1991 and the warranty is not a bureaucratic hurdle; if something failed because of how we built it, we fix it.",
      },
    ],
  },
] as const;

export function getGuideBySlug(slug: string): GuideSummary | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function getRelatedGuides(
  slug: string,
  count: number = 3,
): readonly GuideSummary[] {
  return GUIDES.filter((g) => g.slug !== slug).slice(0, count);
}
