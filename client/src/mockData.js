export const INITIAL_YACHTS = [
  { id: "y1", name: "SQX 12 capacity", capacity: 12, hourlyRate: 300, description: "Compact luxury cruiser ideal for small private gatherings." },
  { id: "y2", name: "SQX", capacity: 8, hourlyRate: 400, description: "Elegant sports cruiser with open deck." },
  { id: "y3", name: "30 capacity", capacity: 30, hourlyRate: 600, description: "Mid-sized deck yacht with twin salons." },
  { id: "y4", name: "SQX 45 capacity", capacity: 45, hourlyRate: 850, description: "Sleek cat-hulled party yacht with lounge decks." },
  { id: "y5", name: "SQX 75 capacity", capacity: 75, hourlyRate: 1400, description: "Double-deck mega vessel fitted for corporate events." }
];

export const INITIAL_SALES_PERSONS = [
  { id: "s1", name: "Pradeesh Ezhava" },
  { id: "s2", name: "Chetan" }
];

export const INITIAL_BOOKINGS = [
  // Past Month bookings (Completed & Fully Paid)
  {
    id: "b1",
    guestName: "Tony Stark",
    adults: 6,
    children: 2,
    totalGuests: 8,
    yachtId: "y4", // SQX 45 capacity
    startDate: "2026-05-10T12:00",
    endDate: "2026-05-10T16:00",
    durationHours: 4,
    pickupLocation: "Marina Bay Pier 2",
    cateringEnabled: true,
    externalServiceCharges: 250,
    subtotal: 4050, // Yacht: 4*850=3400 + Catering: 8*50=400 + External: 250 = 4050
    vatRate: 7,
    vatAmount: 284, // 7% of 4050 = 283.5 rounded
    totalAmount: 4334,
    paymentMode: "Bank Transfer",
    paymentAmount: 4334,
    status: "Completed",
    salesPerson: "Pradeesh Ezhava",
    createdAt: "2026-05-01T09:30"
  },
  {
    id: "b2",
    guestName: "Peter Parker",
    adults: 2,
    children: 0,
    totalGuests: 2,
    yachtId: "y1", // SQX 12 capacity
    startDate: "2026-05-15T15:00",
    endDate: "2026-05-15T18:00",
    durationHours: 3,
    pickupLocation: "Downtown Harbor Terminal",
    cateringEnabled: false,
    externalServiceCharges: 0,
    subtotal: 900, // Yacht: 3*300=900
    vatRate: 0, // No VAT applied
    vatAmount: 0,
    totalAmount: 900,
    paymentMode: "Card",
    paymentAmount: 900,
    status: "Completed",
    salesPerson: "Chetan",
    createdAt: "2026-05-12T14:15"
  },
  {
    id: "b3",
    guestName: "Bruce Banner",
    adults: 10,
    children: 4,
    totalGuests: 14,
    yachtId: "y5", // SQX 75 capacity
    startDate: "2026-05-22T09:00",
    endDate: "2026-05-22T14:00",
    durationHours: 5,
    pickupLocation: "North Point Yacht Club",
    cateringEnabled: true,
    externalServiceCharges: 500,
    subtotal: 8200, // Yacht: 5*1400=7000 + Catering: 14*50=700 + External: 500 = 8200
    vatRate: 5,
    vatAmount: 410, // 5% of 8200
    totalAmount: 8610,
    paymentMode: "Bank Transfer",
    paymentAmount: 8610,
    status: "Completed",
    salesPerson: "Pradeesh Ezhava",
    createdAt: "2026-05-18T10:00"
  },
  // Current Month Bookings
  {
    id: "b4",
    guestName: "Clark Kent",
    adults: 4,
    children: 1,
    totalGuests: 5,
    yachtId: "y3", // 30 capacity
    startDate: "2026-06-05T14:00",
    endDate: "2026-06-05T18:00",
    durationHours: 4,
    pickupLocation: "Downtown Harbor Terminal",
    cateringEnabled: true,
    externalServiceCharges: 150,
    subtotal: 2800, // Yacht: 4*600=2400 + Catering: 5*50=250 + External: 150 = 2800
    vatRate: 7,
    vatAmount: 196,
    totalAmount: 2996,
    paymentMode: "Online",
    paymentAmount: 2996,
    status: "Completed",
    salesPerson: "Chetan",
    createdAt: "2026-06-01T11:00"
  },
  {
    id: "b5",
    guestName: "Selina Kyle",
    adults: 3,
    children: 0,
    totalGuests: 3,
    yachtId: "y1", // SQX 12 capacity
    startDate: "2026-06-12T18:00",
    endDate: "2026-06-12T21:00",
    durationHours: 3,
    pickupLocation: "Marina Bay Pier 2",
    cateringEnabled: false,
    externalServiceCharges: 300,
    subtotal: 1200, // Yacht: 3*300=900 + External: 300 = 1200
    vatRate: 0,
    vatAmount: 0,
    totalAmount: 1200,
    paymentMode: "Cash",
    paymentAmount: 1200,
    status: "Completed",
    salesPerson: "Pradeesh Ezhava",
    createdAt: "2026-06-10T16:45"
  },
  {
    id: "b6",
    guestName: "Arthur Curry",
    adults: 20,
    children: 5,
    totalGuests: 25,
    yachtId: "y5", // SQX 75 capacity
    startDate: "2026-06-18T11:00",
    endDate: "2026-06-18T17:00",
    durationHours: 6,
    pickupLocation: "Marina Bay Pier 2",
    cateringEnabled: true,
    externalServiceCharges: 800,
    subtotal: 10450, // Yacht: 6*1400=8400 + Catering: 25*50=1250 + External: 800 = 10450
    vatRate: 5,
    vatAmount: 523, // 5% of 10450
    totalAmount: 10973,
    paymentMode: "Bank Transfer",
    paymentAmount: 10973,
    status: "Completed",
    salesPerson: "Chetan",
    createdAt: "2026-06-12T13:20"
  },
  {
    id: "b7",
    guestName: "Barry Allen",
    adults: 5,
    children: 2,
    totalGuests: 7,
    yachtId: "y3", // 30 capacity
    startDate: "2026-06-25T13:00",
    endDate: "2026-06-25T16:00",
    durationHours: 3,
    pickupLocation: "North Point Yacht Club",
    cateringEnabled: true,
    externalServiceCharges: 100,
    subtotal: 2250, // Yacht: 3*600=1800 + Catering: 7*50=350 + External: 100 = 2250
    vatRate: 7,
    vatAmount: 158,
    totalAmount: 2408,
    paymentMode: "Online",
    paymentAmount: 2408,
    status: "Confirmed",
    salesPerson: "Pradeesh Ezhava",
    createdAt: "2026-06-20T10:00"
  },
  {
    id: "b8",
    guestName: "Hal Jordan",
    adults: 12,
    children: 0,
    totalGuests: 12,
    yachtId: "y4", // SQX 45 capacity
    startDate: "2026-06-28T16:00",
    endDate: "2026-06-28T21:00",
    durationHours: 5,
    pickupLocation: "Marina Bay Pier 2",
    cateringEnabled: true,
    externalServiceCharges: 200,
    subtotal: 5050, // Yacht: 5*850=4250 + Catering: 12*50=600 + External: 200 = 5050
    vatRate: 0,
    vatAmount: 0,
    totalAmount: 5050,
    paymentMode: "Bank Transfer",
    paymentAmount: 2000,
    status: "Confirmed",
    salesPerson: "Chetan",
    createdAt: "2026-06-22T15:30"
  },
  // Upcoming Future Bookings
  {
    id: "b9",
    guestName: "Wanda Maximoff",
    adults: 4,
    children: 0,
    totalGuests: 4,
    yachtId: "y1", // SQX 12 capacity
    startDate: "2026-07-05T10:00",
    endDate: "2026-07-05T14:00",
    durationHours: 4,
    pickupLocation: "Downtown Harbor Terminal",
    cateringEnabled: true,
    externalServiceCharges: 150,
    subtotal: 1550, // Yacht: 4*300=1200 + Catering: 4*50=200 + External: 150 = 1550
    vatRate: 5,
    vatAmount: 78, // 5% of 1550
    totalAmount: 1628,
    paymentMode: "Card",
    paymentAmount: 1628,
    status: "Confirmed",
    salesPerson: "Pradeesh Ezhava",
    createdAt: "2026-06-29T11:00"
  },
  {
    id: "b10",
    guestName: "Stephen Strange",
    adults: 8,
    children: 2,
    totalGuests: 10,
    yachtId: "y5", // SQX 75 capacity
    startDate: "2026-07-12T14:00",
    endDate: "2026-07-12T20:00",
    durationHours: 6,
    pickupLocation: "North Point Yacht Club",
    cateringEnabled: true,
    externalServiceCharges: 400,
    subtotal: 9300, // Yacht: 6*1400=8400 + Catering: 10*50=500 + External: 400 = 9300
    vatRate: 7,
    vatAmount: 651, // 7% of 9300
    totalAmount: 9951,
    paymentMode: "Bank Transfer",
    paymentAmount: 0,
    status: "Pending",
    salesPerson: "Pradeesh Ezhava",
    createdAt: "2026-06-28T09:15"
  }
];

export const SYSTEM_DEFAULTS = {
  cateringPricePerGuest: 50
};

export const INITIAL_USERS = [
  { id: "u1", name: "Pradeesh Ezhava", type: "Regular User", designation: "Sales", role: "sales", active: true, password: "sales123" },
  { id: "u2", name: "Chetan", type: "Regular User", designation: "Sales", role: "sales", active: true, password: "sales123" },
  { id: "u3", name: "SQ Accounts", type: "Regular User", designation: "Accounts", role: "accounts", active: true, password: "accounts123" },
  { id: "u4", name: "SQ ADMIN", type: "Admin", designation: "Admin", role: "admin", active: true, password: "admin123" }
];
