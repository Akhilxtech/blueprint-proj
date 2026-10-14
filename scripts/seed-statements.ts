
import "dotenv/config";
import { prisma } from "../lib/db";

const statements = [
  {
    id: "round3-seed-ecommerce",
    title: "Smart E-Commerce Platform",
    domain: "E-Commerce",
    difficulty: "Intermediate",
    shortDescription:
      "Build a shopping platform with inventory tracking, cart management, and order status updates.",
    description: `# Smart E-Commerce Platform

Build a web application where customers can browse products, manage a shopping cart, place orders, and track deliveries.

The platform should provide an admin interface to manage products and monitor orders. Focus on a clear user experience and reliable order processing.`,
    constraints:
      "Prevent orders from exceeding available stock.\nValidate quantities and prices on the server.\nKeep customer order details private.",
    deliverables:
      "Product listing and search\nShopping cart\nOrder placement flow\nInventory management dashboard\nOrder status tracking",
    displayOrder: 1,
    hints: [
      ["Product catalogue", "Start with a product model containing a name, price, category, and stock quantity."],
      ["Cart and orders", "Keep cart operations separate from order creation. Validate stock before confirming an order."],
      ["Inventory safety", "Update inventory on the server and prevent negative stock when multiple orders arrive."],
    ],
  },
  {
    id: "round3-seed-healthcare",
    title: "Healthcare Appointment Portal",
    domain: "Healthcare",
    difficulty: "Intermediate",
    shortDescription:
      "Create a portal for patients to discover doctors, book appointments, and view appointment history.",
    description: `# Healthcare Appointment Portal

Build a portal connecting patients with healthcare providers. Patients should find doctors by specialty, check availability, book appointments, and review their upcoming and past visits.

Include a simple provider dashboard to manage appointment slots.`,
    constraints:
      "Do not expose patient information to other patients.\nPrevent conflicting bookings for the same doctor and time slot.\nUse fictional data only.",
    deliverables:
      "Doctor directory\nAppointment availability calendar\nBooking and cancellation flow\nProvider schedule dashboard\nAppointment history",
    displayOrder: 2,
    hints: [
      ["Data model", "Consider separate models for doctors, patients, availability slots, and appointments."],
      ["Booking rules", "Check slot availability on the server immediately before creating a booking."],
      ["Privacy", "Return only the patient information needed by the current signed-in user."],
    ],
  },
  {
    id: "round3-seed-education",
    title: "Student Learning Tracker",
    domain: "Education",
    difficulty: "Intermediate",
    shortDescription:
      "Build a learning dashboard that tracks courses, lessons, assignments, and student progress.",
    description: `# Student Learning Tracker

Create a platform where students enrol in courses, complete lessons, submit assignments, and track progress.

Instructors should be able to publish lessons, create assignments, and review submissions.`,
    constraints:
      "Students must not modify another student's progress.\nOnly instructors may publish or edit course content.\nProgress must be calculated consistently.",
    deliverables:
      "Course catalogue\nLesson and assignment pages\nStudent progress dashboard\nInstructor content management\nAssignment submission view",
    displayOrder: 3,
    hints: [
      ["Course structure", "Organize courses into lessons and assignments, with enrolment connecting students to courses."],
      ["Progress", "Store completion status per student and lesson instead of keeping one manually edited percentage."],
      ["Access control", "Check course enrolment and instructor permissions on the server."],
    ],
  },
  {
    id: "round3-seed-transport",
    title: "Public Transport Journey Planner",
    domain: "Transport",
    difficulty: "Intermediate",
    shortDescription:
      "Help commuters explore routes, compare journeys, and save frequently used trips.",
    description: `# Public Transport Journey Planner

Build a journey planner using a supplied dataset of stops, routes, and schedules.

Users should search for journeys between stops, compare available options, and save favourite routes. Live GPS tracking is not required.`,
    constraints:
      "Use the provided or fictional transport dataset.\nClearly distinguish scheduled information from live information.\nHandle invalid or unreachable destinations.",
    deliverables:
      "Stop search\nRoute and schedule browser\nJourney comparison results\nFavourite routes\nResponsive commuter interface",
    displayOrder: 4,
    hints: [
      ["Dataset", "Represent stops, routes, and scheduled departures as structured records."],
      ["Journey search", "Start with direct routes and then consider connecting routes if time permits."],
      ["Usability", "Show departure times, transfers, and estimated journey duration together."],
    ],
  },
  {
    id: "round3-seed-food",
    title: "Food Delivery Management",
    domain: "Food Delivery",
    difficulty: "Intermediate",
    shortDescription:
      "Develop a food ordering system with restaurant menus, order tracking, and delivery status management.",
    description: `# Food Delivery Management

Create a platform where customers browse restaurants, select menu items, place orders, and follow order progress.

Restaurants should manage their menus, while a delivery dashboard updates the order through preparation, pickup, and delivery.`,
    constraints:
      "Reject unavailable menu items.\nValidate order totals on the server.\nAllow only valid order status transitions.",
    deliverables:
      "Restaurant and menu listing\nFood cart and checkout\nRestaurant order dashboard\nDelivery status updates\nCustomer order history",
    displayOrder: 5,
    hints: [
      ["Menu model", "Represent each menu item with a price and availability flag."],
      ["Order lifecycle", "Define allowed states such as PLACED, PREPARING, PICKED_UP, and DELIVERED."],
      ["Totals", "Calculate prices on the server using trusted menu data rather than client-submitted totals."],
    ],
  },
  {
    id: "round3-seed-events",
    title: "Event Registration and Check-In",
    domain: "Events",
    difficulty: "Intermediate",
    shortDescription:
      "Create an event management platform with registration limits, attendee lists, and check-in.",
    description: `# Event Registration and Check-In

Build a platform for creating events, registering attendees, managing capacity, and recording attendance.

Organizers should see registration statistics and check in registered participants using a unique registration code.`,
    constraints:
      "Do not exceed event capacity.\nPrevent duplicate registrations and duplicate check-ins.\nRestrict attendee data to authorized organizers.",
    deliverables:
      "Event discovery page\nRegistration form\nCapacity tracking\nOrganizer dashboard\nAttendance check-in interface",
    displayOrder: 6,
    hints: [
      ["Registration", "Use a unique registration record connecting an attendee to an event."],
      ["Capacity", "Check available capacity on the server when registering, not only when rendering the form."],
      ["Check-in", "Give each registration a unique identifier and record when it is checked in."],
    ],
  },
  {
    id: "round3-seed-banking",
    title: "Personal Finance and Expense Tracker",
    domain: "Banking",
    difficulty: "Intermediate",
    shortDescription:
      "Build a personal finance application with expense categories, budgets, and spending reports.",
    description: `# Personal Finance and Expense Tracker

Create a personal finance dashboard that lets users record income and expenses, categorize transactions, set monthly budgets, and review spending trends.

Use fictional transactions. Real banking integrations are not required.`,
    constraints:
      "Users must access only their own financial records.\nValidate amounts and dates.\nNever store real banking credentials.",
    deliverables:
      "Income and expense entry\nCategory management\nMonthly budget setup\nSpending summaries\nTransaction history",
    displayOrder: 7,
    hints: [
      ["Transactions", "Store transaction type, amount, date, category, and owner."],
      ["Budget calculation", "Aggregate expenses by category and month to compare spending against budgets."],
      ["Security", "Derive the current user's identity from the session on the server."],
    ],
  },
  {
    id: "round3-seed-social",
    title: "Community Discussion Network",
    domain: "Social Media",
    difficulty: "Intermediate",
    shortDescription:
      "Build a community platform with posts, comments, reactions, and content reporting.",
    description: `# Community Discussion Network

Create a small community application where registered users publish posts, comment on discussions, react to content, and report inappropriate posts.

Include a moderation view for reviewing reports.`,
    constraints:
      "Only authenticated users can create content.\nPrevent duplicate reactions by the same user on a post.\nValidate and safely render user-generated text.",
    deliverables:
      "Post feed\nCreate and edit own posts\nComments and reactions\nContent reporting\nModeration dashboard",
    displayOrder: 8,
    hints: [
      ["Relationships", "Connect posts to authors, comments to posts, and reports to reported content."],
      ["Reactions", "Use a uniqueness constraint to prevent duplicate reactions."],
      ["Moderation", "Separate reporting a post from deleting it, so moderators can review reports."],
    ],
  },
  {
    id: "round3-seed-inventory",
    title: "Warehouse Inventory Monitor",
    domain: "Logistics",
    difficulty: "Intermediate",
    shortDescription:
      "Track warehouse stock, incoming shipments, outgoing orders, and low-stock alerts.",
    description: `# Warehouse Inventory Monitor

Build an inventory system for a small warehouse. Staff should view stock levels, record incoming shipments, track outgoing stock, and review low-stock alerts.

Provide a history of stock movements for auditing.`,
    constraints:
      "Stock quantities cannot become negative.\nEvery stock adjustment must record its reason.\nOnly authorized staff can adjust inventory.",
    deliverables:
      "Inventory catalogue\nStock-in and stock-out operations\nLow-stock alerts\nMovement history\nInventory summary dashboard",
    displayOrder: 9,
    hints: [
      ["Stock model", "Track each product's current quantity and minimum stock threshold."],
      ["Movement history", "Record every adjustment as a separate stock movement."],
      ["Consistency", "Validate stock availability on the server before recording outgoing stock."],
    ],
  },
  {
    id: "round3-seed-agriculture",
    title: "Smart Farming Advisory Dashboard",
    domain: "Agriculture",
    difficulty: "Intermediate",
    shortDescription:
      "Help farmers record crop details, monitor field conditions, and view basic crop-care recommendations.",
    description: `# Smart Farming Advisory Dashboard

Build a dashboard for farmers to record crops, planting dates, field observations, and irrigation activities.

Use a supplied or fictional dataset to display weather observations and rule-based crop-care suggestions. Hardware integration is not required.`,
    constraints:
      "Clearly label simulated weather data.\nDo not present basic rules as guaranteed agricultural advice.\nKeep farm records separated by owner.",
    deliverables:
      "Farm and crop records\nField observation form\nWeather information panel\nRule-based recommendations\nCrop activity history",
    displayOrder: 10,
    hints: [
      ["Farm records", "Associate each crop and field observation with a farm."],
      ["Recommendations", "Start with simple rules based on crop type and recorded conditions."],
      ["Data clarity", "Display the observation time and whether the data is simulated."],
    ],
  },
  {
    id: "round3-seed-energy",
    title: "Household Energy Usage Dashboard",
    domain: "Energy",
    difficulty: "Intermediate",
    shortDescription:
      "Visualize household energy consumption and estimate costs from sample meter readings.",
    description: `# Household Energy Usage Dashboard

Create an application that imports or records sample electricity readings and visualizes consumption by day, week, and month.

Users should compare periods and estimate costs using a configurable tariff.`,
    constraints:
      "Validate meter readings and timestamps.\nClearly label estimated costs.\nDo not require real smart-meter integration.",
    deliverables:
      "Reading entry or import\nConsumption charts\nPeriod comparison\nConfigurable tariff\nEstimated bill summary",
    displayOrder: 11,
    hints: [
      ["Readings", "Store readings with timestamps and calculate usage differences."],
      ["Aggregation", "Group consumption into daily and monthly totals."],
      ["Cost estimate", "Keep the tariff configurable and explain that the result is an estimate."],
    ],
  },
  {
    id: "round3-seed-travel",
    title: "Travel Itinerary Organizer",
    domain: "Travel",
    difficulty: "Intermediate",
    shortDescription:
      "Let travellers organize destinations, activities, reservations, and trip budgets in one itinerary.",
    description: `# Travel Itinerary Organizer

Build a travel planner where users create trips, add destinations and activities, organize days, and track estimated expenses.

Users should be able to share a read-only itinerary with other travellers.`,
    constraints:
      "Users can edit only trips they own or have permission to manage.\nValidate dates and expense amounts.\nShared views must not expose private account details.",
    deliverables:
      "Trip creation\nDay-wise itinerary\nActivity management\nTrip budget summary\nRead-only sharing view",
    displayOrder: 12,
    hints: [
      ["Trip structure", "Model trips, itinerary days, activities, and expenses separately."],
      ["Ordering", "Allow activities to be reordered within each itinerary day."],
      ["Sharing", "Use a dedicated read-only sharing mechanism with limited data exposure."],
    ],
  },
  {
    id: "round3-seed-recruitment",
    title: "Campus Recruitment Portal",
    domain: "Recruitment",
    difficulty: "Intermediate",
    shortDescription:
      "Create a recruitment portal with job listings, eligibility checks, and application tracking.",
    description: `# Campus Recruitment Portal

Build a portal where recruiters publish openings and students apply to positions that match their eligibility.

Recruiters should track applications through a defined hiring workflow, and students should see their application status.`,
    constraints:
      "Prevent duplicate applications to the same opening.\nValidate eligibility on the server.\nStudents must not view other students' private applications.",
    deliverables:
      "Job listings\nEligibility information\nApplication submission\nRecruiter applicant dashboard\nApplication status tracking",
    displayOrder: 13,
    hints: [
      ["Eligibility", "Represent each opening's minimum requirements as structured fields."],
      ["Applications", "Connect an application to one student and one opening, with a uniqueness constraint."],
      ["Status flow", "Define valid transitions such as APPLIED, SHORTLISTED, and REJECTED."],
    ],
  },
  {
    id: "round3-seed-environment",
    title: "Community Waste Collection Tracker",
    domain: "Environment",
    difficulty: "Intermediate",
    shortDescription:
      "Track waste collection requests, pickup schedules, and recycling participation across neighbourhoods.",
    description: `# Community Waste Collection Tracker

Create a platform where residents report collection needs, view pickup schedules, and track request status.

Collection staff should manage assigned requests and record completion. An overview should show collection activity by neighbourhood.`,
    constraints:
      "Residents can manage only their own requests.\nOnly authorized staff can mark pickups complete.\nUse fictional locations if map integration is unavailable.",
    deliverables:
      "Collection request form\nPickup schedule\nRequest status tracking\nStaff assignment view\nNeighbourhood activity summary",
    displayOrder: 14,
    hints: [
      ["Request workflow", "Give each request a status and timestamps for important transitions."],
      ["Staff view", "Filter requests by status, area, or assigned staff member."],
      ["Reporting", "Aggregate completed collections by date and neighbourhood."],
    ],
  },
  {
    id: "round3-seed-support",
    title: "Customer Support Ticket System",
    domain: "Customer Support",
    difficulty: "Intermediate",
    shortDescription:
      "Build a ticketing system with priorities, assignment, comments, and resolution tracking.",
    description: `# Customer Support Ticket System

Build a support portal where customers raise tickets and support agents manage queues, priorities, assignments, and resolutions.

Customers should see updates on their own tickets, while agents should have a dashboard for their assigned work.`,
    constraints:
      "Customers may access only their own tickets.\nTicket status transitions must be validated.\nRecord important assignment and resolution timestamps.",
    deliverables:
      "Ticket creation form\nPriority and category management\nAgent assignment dashboard\nTicket conversation history\nResolution and status tracking",
    displayOrder: 15,
    hints: [
      ["Ticket structure", "Store ticket details separately from comments and assignment history."],
      ["Priorities", "Support filtering and sorting by priority, creation time, and status."],
      ["Access control", "Check ticket ownership or agent permissions before returning ticket details."],
    ],
  },
] as const;

async function main() {
  let created = 0;
  let updated = 0;

  for (const item of statements) {
    const { hints, ...statementData } = item;

    const existing = await prisma.problemStatement.findUnique({
      where: { id: item.id },
      select: { id: true },
    });

    await prisma.problemStatement.upsert({
      where: { id: item.id },
      create: statementData,
      update: statementData,
    });

    for (let index = 0; index < hints.length; index++) {
      const [title, content] = hints[index];

      await prisma.statementHint.upsert({
        where: {
          statementId_order: {
            statementId: item.id,
            order: index + 1,
          },
        },
        create: {
          statementId: item.id,
          order: index + 1,
          title,
          content,
        },
        update: {
          title,
          content,
        },
      });
    }

    if (existing) {
      updated++;
    } else {
      created++;
    }

    console.log(
      `${existing ? "Updated" : "Created"}: ${item.title}`,
    );
  }

  console.log(
    `Seed complete. Created: ${created}, updated: ${updated}, total: ${statements.length}.`,
  );
}

main()
  .catch((error) => {
    console.error("Round 3 statement seeding failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
