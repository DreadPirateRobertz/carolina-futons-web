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
        heading: "The two numbers that matter most",
        body: "A Murphy cabinet bed needs clearance in two directions: depth when closed and swing space when open. Our cabinet beds are 12–14 inches deep when folded — shallower than a dresser. When the bed folds down, it needs roughly 78–82 inches of clear floor space in front of it (the mattress length plus a few inches for the mechanism). That's the number people underestimate. A 10-foot room has 120 inches; a fully open queen bed (80 inches) plus the cabinet depth (14 inches) leaves about 26 inches at the far wall — enough to stand, not enough for a desk. Plan the room with the bed open, not closed.",
      },
      {
        heading: "Wall requirements: what 'no hardware' actually means",
        body: "Our cabinet beds are freestanding — the cabinet sits on the floor and requires no wall anchoring to operate. The mattress and frame are supported entirely by the cabinet structure. You do need a flat wall behind the cabinet for stability; the cabinet leans slightly against it. Stud location doesn't matter for installation, but if you want to secure the cabinet against tipping (recommended in households with children), two lag bolts into studs at the top of the cabinet take about 15 minutes. We include the hardware. Drywall anchors alone are not sufficient — locate studs.",
      },
      {
        heading: "Mattress depth and the fold mechanism",
        body: "Cabinet beds ship with a specific mattress: typically a 5–6 inch memory foam or innerspring that is engineered to fold in thirds without cracking. Standard mattresses — including the futon mattresses we sell separately — do not work in Murphy cabinet frames. The fold mechanism relies on the mattress being the right thickness and having a tri-fold design. Substituting a thicker mattress creates resistance that damages the hinges and voids the warranty. If you want a thicker sleeping surface, look at models that accommodate an 8-inch tri-fold; most of our queen cabinet beds support this.",
      },
      {
        heading: "Sizing: queen vs full",
        body: "Most customers choose queen. A full cabinet bed (54 × 75 inch mattress) is the right choice when the room is genuinely narrow — under 10 feet — or when the primary use case is a single adult. A queen (60 × 80 inch) gives two adults a comfortable sleep surface and reads as a proper guest room rather than a space-saving compromise. The cabinet widths differ by about 8 inches (full runs ~66 inches wide; queen ~74 inches), so measure your wall. Height is similar — both close to 87 inches, so standard 8-foot ceilings work with a few inches of clearance.",
      },
      {
        heading: "What the room looks like closed",
        body: "The main reason people buy Murphy cabinet beds over traditional wall beds is aesthetics when closed. The cabinet looks like a wardrobe or armoire — it has doors, a finished top, and in most of our models, open shelving flanking the cabinet. That shelving is load-bearing in the sense that it's structurally part of the unit, but you can use it for books, plants, or display. One thing to note: the shelving on either side of the cabinet adds to the total footprint. Our standard queen with side shelves runs about 102 inches wide. If you want only the bed cabinet without flanking shelves, the unit is closer to 74 inches. Measure both configurations before ordering.",
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
        heading: "The core difference",
        body: "A futon converts between sofa and bed. A platform bed is fixed as a bed. That distinction sounds obvious, but the practical implications cascade: a futon gives you seating you wouldn't otherwise have; a platform bed gives you a better sleeping surface and a cleaner look. The decision usually comes down to how the room is used day-to-day. If the futon would replace a sofa — meaning the room has no other seating — it's pulling double duty that justifies the compromise. If the room already has seating and the futon would just be a bed, a platform bed is almost always a better choice.",
      },
      {
        heading: "When a futon wins",
        body: "A futon is the better choice in three situations: a studio apartment where it's the only seating, a spare bedroom that's also used as an office or TV room, and a dorm or first apartment where flexibility matters more than polish. In these cases, the futon's dual function saves real money and space. The tradeoff is sleeping comfort — even a good futon mattress doesn't match a dedicated bed mattress for nightly use. If the futon will be slept on more than three or four nights a week by the same person, prioritize sleep quality and buy a better mattress, or reconsider whether a platform bed makes more sense.",
      },
      {
        heading: "When a platform bed wins",
        body: "A platform bed wins when the room is a primary bedroom, when the same person sleeps on it most nights, or when aesthetics matter more than flexibility. Platform beds support standard mattresses — including memory foam, innerspring, and hybrid constructions — which sleep better than even the best futon mattress. The low-profile design works in rooms with lower ceilings or sloped walls, and the lack of a box spring keeps the bed height comfortable without feeling like you're climbing into bed. Platform beds also hold their look longer; futon frames show more wear at the fold mechanism over time.",
      },
      {
        heading: "Price and lifespan",
        body: "In our lineup, hardwood futon frames and hardwood platform beds are comparably priced in the $400–$900 range for the frame. The difference in ongoing cost is the mattress. A futon mattress runs $200–$500 and lasts 8–12 years with care. A platform bed with a good memory foam or innerspring mattress typically runs $600–$1,200 for the mattress alone, but can last 10–15 years. The futon is cheaper to start, but if you're replacing the mattress every 8 years for the life of the frame, the costs converge. Longevity depends heavily on use — a futon used mainly as a sofa will outlast a futon slept on nightly by a heavy sleeper.",
      },
      {
        heading: "The hybrid option: a daybed",
        body: "If you want both seating and sleeping in the same piece, a daybed is worth considering as a third option. A daybed sits against a wall on three sides (headboard + two side rails) and uses a standard twin mattress, which reads as a sofa during the day without requiring conversion. It's less flexible than a futon — the sleeping surface is twin only, not full or queen — but it's cleaner looking and uses a better mattress. Daybeds work well in guest rooms that see occasional single-sleeper use. We can walk you through the tradeoffs at the showroom.",
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
        heading: "Start with the bed, not the desk",
        body: "The mistake most people make when laying out a dual-purpose room is placing the desk first and fitting the bed around it. The bed is the larger, less movable constraint — it has to be accessible from at least one long side, and it determines where the light falls for sleeping. Place the bed first, then figure out where the desk goes. In a 10×12 room, a full futon frame in sofa position runs about 79–82 inches wide and 36–38 inches deep. Against the longest wall, that leaves roughly 58–63 inches of width for other furniture — enough for a narrow desk, a bookcase, and a path to the door.",
      },
      {
        heading: "The futon placement rule",
        body: "A futon on an interior wall (no window) is almost always better than a futon under a window. Window placement limits the frame — you can't push it flush against the wall without blocking the window sill, and the gap behind the frame collects dust. An interior wall gives you a full flush placement, which makes the room feel tidier and makes the conversion easier (no awkward gap to reach over). If the only long wall is a window wall, plan for a 4–6 inch stand-off from the sill and accept that the room will look slightly less tailored.",
      },
      {
        heading: "Desk placement for a working guest room",
        body: "A floating desk — no hutch, no overhead storage — keeps the room visually open and is easier to clear off when guests arrive. In a 10×12 room, a 48-inch wide desk perpendicular to the futon wall (angled into the corner) works better than a desk against the opposite wall, because it keeps the two functional zones from facing each other directly. The desk chair can pull in toward the desk when the room is in guest mode, and the futon in sofa position reads as seating for the office zone. This layout also keeps the door clearance unobstructed — the desk chair doesn't block entry.",
      },
      {
        heading: "Lighting the two zones",
        body: "A ceiling light in the center of the room does neither zone well. Add a task light at the desk (clip-on or swing-arm) and a bedside lamp or sconce near the futon. If the room has only one overhead outlet, a smart plug that turns the desk lamp off when the room is in guest mode keeps the wiring simple. Blackout curtains matter more in a dual-purpose room than in a dedicated bedroom — the office zone needs natural light during the day, and the guest zone needs darkness at night. A single blackout curtain layer over sheer panels solves this without requiring two separate window treatments.",
      },
      {
        heading: "Closet and storage strategy",
        body: "A 10×12 guest room with a closet can store the desk accessories when guests arrive — a small bin on the closet shelf handles power strips, cables, and peripherals. If there's no closet, a two-drawer lateral file cabinet doubles as a side table next to the futon and keeps work papers out of guest sight lines. Avoid tall bookshelves on the same wall as the futon; they crowd the room visually and make the sofa-to-bed conversion feel cramped. Low storage — 30 inches or under — keeps the room feeling open and scales better with a futon's horizontal profile.",
      },
      {
        heading: "The full vs queen decision in a small room",
        body: "In a 10×12 room, a full futon frame is almost always the right size. A queen frame in sofa position (86–90 inches wide) leaves less than 3 feet between the frame and the opposite wall — tight for a desk chair and uncomfortable as a traffic path. The 6-inch sleeping width difference between full and queen matters less in a room where guests sleep one or two nights at a time. If the room is used as a primary bedroom and the office use is secondary, size up to queen and accept the tighter desk area. If the room is primarily an office and guests are occasional, full is the better call.",
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
        body: "There is no industry standard for mattress firmness. One manufacturer's 'medium' is another's 'firm.' The label is a marketing shorthand for a feel that depends on your body weight, sleeping position, and what you're comparing the mattress to. The only way to know if a firmness works for you is to lie on it in the position you actually sleep in — not sit on the edge, not press with your hand, but lie on your side or back with your full weight. We keep every mattress we sell on a floor frame at the showroom for exactly this reason. If you're ordering remotely, use the weight guidelines below as a starting point and call us if you're unsure.",
      },
      {
        heading: "Soft",
        body: "Soft mattresses allow more sinkage, particularly at the shoulders and hips. They work best for side sleepers and lighter-weight people (under 130 lbs) whose body doesn't generate enough pressure to sink into a medium or firm mattress. If you sleep on your side and wake up with shoulder or hip pain on a medium mattress, the problem is usually lack of pressure relief — a softer surface lets those joints sink to a neutral spine position. The risk with soft mattresses is that heavier people bottom out into the coils or bottom layer, which creates its own alignment problem. In our futon lineup, soft fills are cotton or foam construction; they break in quickly and feel noticeably different after the first 30 nights.",
      },
      {
        heading: "Medium",
        body: "Medium is the lowest-risk firmness choice for first-time buyers and for households where more than one person sleeps on the mattress with different preferences. It provides enough support for back sleepers and enough give for side sleepers in the 130–220 lb range. If you're ordering without testing, medium is the default recommendation. Most of our mattresses ship as medium unless specified otherwise, and medium is what we put on floor frames that aren't specifically labeled soft or firm. One thing to know: hybrid mattresses (cotton batting over coils) feel firmer as a sofa than they do as a bed — the coil layer compresses differently under sitting pressure than under full-body lying pressure.",
      },
      {
        heading: "Firm",
        body: "Firm mattresses resist sinkage and work best for stomach sleepers and back sleepers with lower back pain who need a flat, supportive surface. Heavier sleepers (over 220 lbs) also tend to prefer firm because they apply enough pressure to compress a medium mattress past its intended feel. In our cotton-fill lineup, firm mattresses feel noticeably harder the first few weeks before the batting breaks in — if you order a firm cotton mattress and it feels like sleeping on a board for the first two weeks, that's expected and it will soften measurably by week four. If it's still uncomfortable at six weeks, call us.",
      },
      {
        heading: "The futon-specific wrinkle: sitting vs sleeping firmness",
        body: "A futon mattress that reads as 'medium' when lying on it will feel noticeably firmer when sitting on it — sitting applies concentrated pressure through the thighs rather than distributed weight across the whole surface. This surprises people who test a futon in the showroom lying down and find it comfortable, then feel like it's too hard once they're using it as a sofa daily. The reverse also happens: a firm futon that feels uncomfortable for sleeping can feel perfectly supportive as a sofa. If your futon is primarily a sofa with occasional sleeping, bias firm. If it's primarily a bed, bias soft or medium and accept slightly less sitting support.",
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
