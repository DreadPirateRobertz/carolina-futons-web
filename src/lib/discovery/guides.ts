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
    sections: [
      {
        heading: "Cabinet bed vs wall-mount murphy bed",
        body: "Most of what people picture as a \"murphy bed\" — the kind that swings down from a wall-mounted cabinet — requires studs, wall anchors, and often a contractor. Cabinet beds are a different animal: they're freestanding furniture that looks like a dresser or chest when closed and unfolds into a queen mattress when you need it. No wall mounting, no tools beyond the assembly kit, and you can move them if you rearrange the room. For most homeowners and renters, a cabinet bed is the more practical buy. For this guide, we'll address both, since the sizing logic differs.",
      },
      {
        heading: "Floor space when the bed is open",
        body: "A queen cabinet bed needs approximately 90 inches of floor space in front of the cabinet when fully extended. The cabinet itself is typically 65–72 inches wide and 18–24 inches deep (closed). Measure from the back wall to 90 inches outward before you buy — in a 12-foot room you'll have comfortable clearance; in a 10-foot room the bed will nearly span the depth of the room. For a traditional wall-mount murphy bed, the calculation is similar: the bed's own length (80 inches for a queen) plus a few inches of clearance beyond the foot of the bed. Neither style allows other furniture in the opening zone while the bed is in use.",
      },
      {
        heading: "The mattress you can't swap",
        body: "Cabinet beds use a proprietary bi-fold mattress that folds with the mechanism. You cannot use a standard mattress — it won't fold and will jam or damage the mechanism. The included mattress from most manufacturers (Night & Day Furniture, which we carry) is either a 4-inch or 6-inch memory foam bi-fold. The 4-inch is comfortable for occasional guests; the 6-inch is meaningfully better for anyone sleeping on it multiple nights in a row or for side sleepers. Both feel slightly firmer than a flat equivalent because of the center fold seam, which softens with use after 10–15 nights.",
      },
      {
        heading: "Cabinet dimensions to plan around",
        body: "A standard queen cabinet bed closes to roughly 65–72 inches wide, 75–84 inches tall, and 18–24 inches deep. Think of it as a large armoire or dresser from a clearance standpoint. The cabinet top is flat and rated for 50–75 lbs on most models — many customers use it as a TV stand or bookshelf when the bed is stored. The side clearance you need is 18 inches on each side of the open bed for nightstand access; the bed itself will be at standard queen width (60 inches) when open, centered in the cabinet opening.",
      },
      {
        heading: "Wall-mount murphy bed build-out depth",
        body: "A traditional wall-mount murphy bed requires a wall unit that projects 12–18 inches from the wall surface when the bed is stored. The unit needs to be anchored to studs — standard drywall alone won't hold a 200+ lb bed. Most installations require a contractor or a confident DIYer with stud-finding tools and experience with lag bolts. The finished cabinet face is typically flush when the bed is up, creating a clean room appearance. Factor in the cost of installation ($300–$800 from a handyman, $1,000+ from a dedicated installer) when comparing total cost to a cabinet bed.",
      },
      {
        heading: "Which size: full vs queen",
        body: "Queen is the standard choice for guest rooms where two adults might sleep. The queen sleeping surface is 60 × 80 inches, and the cabinet is 8–10 inches wider than a full equivalent. If the room is genuinely tight — under 11 feet of usable width — consider a full (54 × 75 inches). The size difference is most important when two adults are sleeping simultaneously; a single guest on either size will sleep fine. Taller guests (over 6 feet) will appreciate the 5 extra inches of length a queen provides.",
      },
    ],
  },
  {
    slug: "platform-bed-vs-futon",
    title: "Platform bed vs futon",
    hook: "When a daybed or platform frame beats a folding futon, and vice versa.",
    readingTimeMin: 5,
    sections: [
      {
        heading: "The core question",
        body: "A futon and a platform bed are both good furniture. The wrong choice isn't usually a mistake in quality — it's a mistake in function. The key variable is whether you need a sofa during the day. If you do, a futon earns its footprint by doing two jobs. If you just need a bed — in a dedicated bedroom, with other seating elsewhere in the home — a platform bed is the better piece. It supports more mattress types, sits at a better height for most sleepers, and doesn't require you to fold and unfold anything.",
      },
      {
        heading: "Where futons win",
        body: "Futons have one structural advantage that platform beds can't match: they convert. A queen futon in sofa position is a comfortable two-person couch. At night it unfolds into a full sleeping surface. For studios, guest rooms that also serve as offices, or any room that needs to function as both a living space and a bedroom, the futon is often the only furniture choice that doesn't require square footage for two separate pieces. Wall hugger frames — which slide forward when converted rather than tipping backward — are particularly good at making this conversion work in tight rooms.",
      },
      {
        heading: "Where platform beds win",
        body: "Platform beds support a much wider range of mattresses. If you want a quality foam, latex, or hybrid mattress — the kinds that sleep significantly better than most futon mattresses — a platform bed is the right frame. The sleeping surface height is also typically better: a platform frame plus an 8–10 inch mattress lands at 24–28 inches, which is easier to get in and out of than a futon frame, which sits lower. Platform beds with built-in storage drawers also eliminate the need for a separate dresser, which is useful in small bedrooms where every inch counts.",
      },
      {
        heading: "Mattress quality: the real difference",
        body: "The best futon mattresses — cotton-hybrid innerspring, 8–10 inches — sleep better than most people expect. But the best platform bed mattresses sleep better still, because they don't need to fold. A standard mattress can use coil configurations, foam densities, and construction techniques that folding mattresses can't accommodate. If primary nightly sleeping comfort is the priority and you have dedicated seating elsewhere, a platform bed with a quality mattress will outperform any futon setup at the same price point.",
      },
      {
        heading: "Longevity and care",
        body: "Both are durable if well-made. Solid hardwood platform beds and futon frames from manufacturers like Night & Day carry 10–15 year warranties and hold up well to years of use. The difference is that a futon mattress takes more mechanical wear — it's repeatedly folded — and typically lasts 8–12 years, slightly less than a standard mattress on a platform bed with comparable care. Both benefit from rotating the mattress periodically and keeping a cover on the mattress to protect the fill.",
      },
    ],
  },
  {
    slug: "room-layout-for-small-spaces",
    title: "Room layout for small spaces",
    hook: "Getting a guest room and a home office out of the same 10×12.",
    readingTimeMin: 8,
    sections: [
      {
        heading: "The 10×12 room and what it can hold",
        body: "A 10×12 room — 120 square feet — is about as small as a dual-purpose room gets before it stops functioning for either purpose. The math is tight but workable. A queen murphy cabinet bed in closed position takes roughly 72 × 24 inches of floor footprint. That leaves you a 10-foot wall with 9+ feet of usable depth on either side of the cabinet. A desk, an office chair, and basic storage fit in that space without blocking the bed's opening zone. The rule: the opening zone (90 inches in front of the cabinet, 60 inches wide for a queen) can't have furniture that can't move. Everything else can fill in around it.",
      },
      {
        heading: "The murphy cabinet bed as the anchor piece",
        body: "In a 10×12 dual-purpose room, the murphy cabinet bed goes on the longest available wall, centered or offset toward a corner depending on window placement. When closed, it looks like a large dresser and doesn't signal \"bedroom\" at all — important for a room that also functions as a workspace. The cabinet top can hold a lamp, books, or a small TV. On the days guests aren't visiting (most days), you have an office. The bed comes out in under 30 seconds. If a cabinet bed is outside the budget, a futon against the opposite wall also works — guests can see it, but it reads as a couch until folded out.",
      },
      {
        heading: "Desk and chair clearance",
        body: "A standard desk is 48–60 inches wide and 24–30 inches deep. An office chair with a person in it extends 20–24 inches behind the desk front. That means desk + chair requires roughly 50 inches of depth from the wall. In a 10-foot room, that leaves 70 inches between the chair and the opposite wall — comfortable walking clearance. The desk should not be positioned in the bed's opening zone. The typical layout: desk on the wall perpendicular to or opposite the murphy cabinet, so the chair faces away from the cabinet and the opening zone stays clear.",
      },
      {
        heading: "Seating that doesn't compete for space",
        body: "A studio apartment challenge: the room that has the bed also usually needs to function as somewhere to sit during the day. For a dedicated home office / guest room, this is less critical — the desk chair is the primary daytime seat, and guests use it during their stay. If you want casual seating, a small armchair (28–32 inches wide, 32–34 inches deep) tucked in a corner is more space-efficient than a loveseat. Avoid placing it in front of the murphy cabinet. A futon in sofa position can serve as guest room seating during the day if the murphy bed option is outside the budget.",
      },
      {
        heading: "Light and visual scale",
        body: "Small rooms feel larger with consistent, uncluttered surfaces. Furniture that matches in finish or tone reduces visual noise. In a 10×12 room with mixed hardwood tones — a walnut-finish murphy cabinet next to an espresso desk — the eye reads two different pieces and the room feels smaller. Choose one finish family and stick to it. Floating shelves over the desk keep floor space clear and scale better than a bookcase. If there's a window, arrange furniture so the walking path toward it is clear — the eye naturally follows the light and the room feels deeper.",
      },
      {
        heading: "Studio apartments: different math",
        body: "A studio under 400 square feet usually can't afford a dedicated zone for a murphy cabinet — it occupies a significant portion of one wall. The classic studio solution is a queen futon against one wall: by day it's the primary sofa, by night it's the bed. This works because the futon's footprint in sofa position (roughly 79 inches wide × 38 inches deep) is the same zone it occupies as a bed. No furniture needs to move for conversion. The key trade-off: you can't have other furniture immediately adjacent to the futon because you need clearance on both sides to unfold it. That missing adjacency can feel constraining in very small studios.",
      },
      {
        heading: "The one thing most people get wrong",
        body: "Most small space layout mistakes aren't about square footage — they're about walking paths. People place furniture in ways that minimize visual dead space but create awkward routes through the room. The minimum comfortable walking path is 36 inches; 24 inches is technically passable but feels cramped. Before you finalize furniture placement, walk the path from the door to the desk, from the desk to the bed, and from the bed to the closet or bathroom. If any path is under 24 inches, something needs to move. A room you navigate comfortably every day feels much larger than a room that forces you to turn sideways.",
      },
    ],
  },
  {
    slug: "mattress-firmness-guide",
    title: "Mattress firmness guide",
    hook: "What soft, medium, and firm actually mean across our mattress lineup.",
    readingTimeMin: 5,
    sections: [
      {
        heading: "Why firmness labels are unreliable",
        body: "Soft, medium, and firm are not standardized terms. What one manufacturer calls firm, another calls medium-firm. The same mattress can feel different to a 130-pound person than to a 220-pound person — heavier sleepers compress the top layers faster and effectively experience a firmer feel. This guide focuses on what to actually test for rather than what the tag says, and on how our specific mattresses perform in practice.",
      },
      {
        heading: "How to think about firmness",
        body: "Firmness interacts with your body in two zones: the pressure zone (shoulders and hips, where you need give so you don't wake up sore) and the support zone (lower back, which needs a surface that doesn't let your midsection sink out of alignment). A mattress that's too soft lets everything sink — pressure relief but poor spinal support. Too firm and you get support but pressure points at the shoulders and hips keep you from sleeping deeply. The right firmness for you is the one that allows your spine to sit in its natural curve while you're lying on your side or back. For most people, that's medium or medium-firm.",
      },
      {
        heading: "Firmness by sleep position",
        body: "Side sleepers need more pressure relief at the shoulder and hip — lean toward medium or soft. The wider the shoulder-to-hip ratio, the more give you need in those zones. Back sleepers need a surface firm enough that the lower back isn't bowing — medium-firm works for most. Stomach sleepers (we don't recommend it, but many people do it) need a firmer surface so the midsection doesn't sink into a lower back arch — firm is usually the right call. If you switch positions during the night, medium is almost always the lowest-risk choice.",
      },
      {
        heading: "Futon mattress firmness: what's different",
        body: "Futon mattresses start firmer than conventional mattresses and soften over the first few weeks of use as the fill breaks in. A new cotton-batting futon mattress will feel noticeably harder than its eventual feel — this surprises people who test one in the showroom and then find it more comfortable six weeks after delivery. If you're testing a floor model that's been used for months, you're experiencing a broken-in feel. An equivalent new mattress will be firmer. Inner-spring futon mattresses start closer to their final feel because the coils compress more predictably than batting.",
      },
      {
        heading: "Weight and firmness",
        body: "The same mattress feels different depending on body weight. Under 130 pounds: medium and firm mattresses may feel harder than the label implies; lean toward medium or soft. 130–200 pounds: medium is usually the right starting point; medium-firm if you sleep on your back. Over 200 pounds: medium mattresses can feel soft and lose support faster — start with medium-firm or firm. Couples with a significant weight difference (40+ pounds) sometimes find it worth considering a split firmness setup, though this isn't available in all mattress formats.",
      },
      {
        heading: "Testing before you buy",
        body: "The most reliable firmness test is lying on the mattress in your actual sleep position for at least 10 minutes. Five minutes isn't enough for your muscles to relax and let your body settle into the surface. When you get up, check: does your lower back feel strained? Do your shoulders feel like they had enough give? If you're ordering without testing, medium is the lowest-risk choice for the majority of sleepers. We're happy to talk through your specific situation by phone at (828) 252-9449 during showroom hours, or stop by the store in Hendersonville and try before you decide.",
      },
    ],
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
