const { query, pool } = require("../config");

/**
 * Seed database with initial data for testing
 * Includes sample salon Q&A pairs for the knowledge base
 */
async function seed() {
  try {
    console.log("Starting database seeding...\n");

    // Sample knowledge base entries for a salon
    const knowledgeBaseEntries = [
      {
        question_pattern: "What are your business hours?",
        answer:
          "We are open Tuesday through Friday from 10 AM to 7 PM, Saturday from 9 AM to 8 PM, and Sunday from 10 AM to 6 PM. We are closed on Mondays.",
        tags: [
          "hours",
          "schedule",
          "timing",
          "open",
          "closed",
          "time",
          "when",
          "monday",
        ],
      },
      {
        question_pattern: "How much does a haircut cost?",
        answer:
          "Our haircut prices start at $45 for a basic cut. Styling packages range from $65 to $120 depending on length and complexity.",
        tags: [
          "pricing",
          "haircut",
          "services",
          "cost",
          "price",
          "rates",
          "how-much",
          "fees",
        ],
      },
      {
        question_pattern: "Do you take walk-ins?",
        answer:
          "Yes, we accept walk-ins based on availability. However, we recommend booking an appointment to guarantee your preferred time slot.",
        tags: [
          "appointments",
          "booking",
          "walk-ins",
          "reservation",
          "schedule",
          "availability",
        ],
      },
      {
        question_pattern: "What services do you offer?",
        answer:
          "We offer haircuts, coloring, highlights, balayage, keratin treatments, hair extensions, manicures, pedicures, facials, and waxing services.",
        tags: ["services", "offerings", "treatments", "menu", "options"],
      },
      {
        question_pattern: "Where are you located?",
        answer:
          "We are located at 847 Oak Street, Edison, NJ 07820, in a shopping plaza with ample parking near Route 27.",
        tags: [
          "location",
          "address",
          "directions",
          "salon",
          "place",
          "business",
          "where",
          "find",
          "parking",
        ],
      },
      {
        question_pattern: "Can I book an appointment online?",
        answer:
          "Yes! You can book appointments through our website or by calling us at (555) 123-4567. We also accept bookings via text.",
        tags: [
          "booking",
          "appointments",
          "online",
          "reservation",
          "schedule",
          "how",
          "website",
        ],
      },
      {
        question_pattern: "What is your cancellation policy?",
        answer:
          "We require 24 hours notice for cancellations. Late cancellations or no-shows may be subject to a $25 fee.",
        tags: [
          "policy",
          "cancellation",
          "fees",
          "rules",
          "cancel",
          "no-show",
          "refund",
        ],
      },
      {
        question_pattern: "Do you offer bridal services?",
        answer:
          "Yes! We offer complete bridal packages including hair, makeup, and trials. Please call us to schedule a consultation.",
        tags: [
          "bridal",
          "wedding",
          "special-events",
          "bride",
          "makeup",
          "packages",
        ],
      },
      {
        question_pattern: "What is your phone number?",
        answer:
          "You can reach us at (732) 555-0194. We are available during business hours to take your calls and answer questions.",
        tags: ["contact", "phone", "call", "number", "reach", "telephone"],
      },
      {
        question_pattern: "What is your email address?",
        answer:
          "You can email us at appointments@priyasbeautylounge.com for inquiries and appointment requests.",
        tags: ["email", "contact", "correspondence", "write", "message"],
      },
      {
        question_pattern: "How much does makeup cost?",
        answer:
          "Basic makeup starts at $50-$70. Party or event makeup ranges from $100-$150. Bridal makeup packages start at $200.",
        tags: [
          "makeup",
          "pricing",
          "cost",
          "party",
          "event",
          "bridal",
          "price",
        ],
      },
      {
        question_pattern: "What facial treatments do you offer?",
        answer:
          "We offer classic facials ($65-$85), anti-aging facials ($95-$130), acne treatment facials ($80-$110), and gold facials ($150).",
        tags: [
          "facial",
          "skincare",
          "treatments",
          "anti-aging",
          "acne",
          "gold",
          "skin",
        ],
      },
      {
        question_pattern: "Do you do threading?",
        answer:
          "Yes! We offer eyebrow threading for $12 and full face threading for $35.",
        tags: ["threading", "eyebrows", "facial-hair", "hair-removal", "brows"],
      },
      {
        question_pattern: "What waxing services do you have?",
        answer:
          "We offer upper lip waxing ($8), full arms ($35), and full legs ($60). Additional waxing services are available upon request.",
        tags: ["waxing", "hair-removal", "legs", "arms", "upper-lip"],
      },
      {
        question_pattern: "Do you do manicures and nails?",
        answer:
          "Yes! We offer basic manicures for $25 and nail art starting at $5-$15 per nail.",
        tags: ["nails", "manicure", "nail-art", "polish", "hands"],
      },
      {
        question_pattern: "Do you offer henna or mehndi?",
        answer:
          "Yes! We specialize in bridal henna/mehndi services ranging from $200-$400 depending on the design complexity.",
        tags: ["henna", "mehndi", "bridal", "special", "indian", "design"],
      },
      {
        question_pattern: "Do you have WiFi or a waiting area?",
        answer:
          "Yes! We have a comfortable waiting lounge with complimentary tea and coffee, plus free WiFi for all clients.",
        tags: ["amenities", "wifi", "waiting", "lounge", "features", "comfort"],
      },
      {
        question_pattern: "Are you open on Mondays?",
        answer:
          "No, we are closed on Mondays. We are open Tuesday through Sunday with varying hours.",
        tags: ["monday", "closed", "hours", "schedule", "days", "day-off"],
      },
      {
        question_pattern: "Who are the stylists?",
        answer:
          "Our team includes Priya Sharma, the owner and senior stylist with 12 years of experience, and Kavya Desai, our junior stylist and assistant.",
        tags: [
          "staff",
          "stylists",
          "team",
          "who",
          "employees",
          "priya",
          "kavya",
        ],
      },
      {
        question_pattern: "How much does hair coloring cost?",
        answer:
          "Full hair coloring services range from $120 to $200 depending on hair length and color complexity.",
        tags: [
          "coloring",
          "pricing",
          "hair",
          "dye",
          "color",
          "highlights",
          "cost",
        ],
      },
    ];

    // Insert knowledge base entries
    console.log("Seeding knowledge base...");
    for (const entry of knowledgeBaseEntries) {
      await query(
        `INSERT INTO knowledge_base (question_pattern, answer, tags)
         VALUES ($1, $2, $3)
         ON CONFLICT (question_pattern) DO NOTHING`,
        [entry.question_pattern, entry.answer, entry.tags]
      );
    }
    console.log(
      `✓ Inserted ${knowledgeBaseEntries.length} knowledge base entries\n`
    );

    console.log("✓ Database seeding completed successfully!");
  } catch (error) {
    console.error("Seeding failed:", error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run seeding if this file is executed directly
if (require.main === module) {
  seed();
}

module.exports = { seed };
