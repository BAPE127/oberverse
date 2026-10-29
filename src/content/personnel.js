// The people who run companies (v0.62.0): skills, jobs, what a job pays and what a person in it can do.
// Everything here is data; src/corp/people.js turns it into candidates, offers and effects, and
// src/systems/personnel.js into a hiring market, payrolls and records. Pay is obols a day.

/** Seventeen skills, 0–100. 20 is a beginner, 50 competent, 70 strong, 90 exceptional. */
export const SKILLS = {
  finance: { name: 'Financial management', text: 'Cash, debt, reserves and forecasts.' },
  budgeting: { name: 'Budgeting and cost control', text: 'Holding spending to a plan; trimming waste and overhead.' },
  production: { name: 'Production planning', text: 'Scheduling work so capacity is used.' },
  procurement: { name: 'Procurement and negotiation', text: 'Buying what is needed at a good price.' },
  logistics: { name: 'Logistics and routes', text: 'Moving things efficiently: ships, loads, routes.' },
  bidding: { name: 'Contract bidding', text: 'Pricing and winning tenders and contracts.' },
  sales: { name: 'Sales and revenue', text: 'Selling what is made at a good price.' },
  research: { name: 'Research and development', text: 'Choosing and driving projects that pay.' },
  workforce: { name: 'Workforce management', text: 'Keeping a crew productive and settled.' },
  maintenance: { name: 'Maintenance planning', text: 'Keeping equipment working and downtime short.' },
  risk: { name: 'Risk management', text: 'Seeing what could go wrong and being ready.' },
  inventory: { name: 'Inventory management', text: 'Holding enough stock, and no more.' },
  agriculture: { name: 'Agricultural operations', text: 'Crops, livestock, seasons, land.' },
  aerospace: { name: 'Aerospace operations', text: 'Aircraft, rockets and satellites in production.' },
  manufacturing: { name: 'Manufacturing operations', text: 'Factory floors, stations, throughput.' },
  strategy: { name: 'Strategic planning', text: 'Where to invest and what to leave alone.' },
  compliance: { name: 'Compliance and controls', text: 'Rules, licences, audits and internal controls.' },
};

/** What a grade of skill is called, for the screens. */
export const GRADES = [[85, 'exceptional'], [70, 'strong'], [50, 'competent'], [35, 'fair'], [0, 'weak']];

/** Authority every job starts with (data a manager's decisions will be held to from stage 7; nothing enforces it yet). */
export const AUTHORITY = {
  executive: { spendLimit: 50000, approvalAbove: 20000, canHire: true, canBorrow: true, canTransfer: true, canContract: true, canExpand: false },
  manager: { spendLimit: 10000, approvalAbove: 3000, canHire: true, canBorrow: false, canTransfer: false, canContract: true, canExpand: false },
  staff: { spendLimit: 1000, approvalAbove: 500, canHire: false, canBorrow: false, canTransfer: false, canContract: false, canExpand: false },
};

const B = ['arms', 'shipping', 'aerospace', 'farming'];

/**
 * Jobs. tier: executive (at the parent company) · manager · staff (at a business). employers: where it can be.
 * keys: the skills the job needs (a candidate must average 35+ in them). limit: how many one employer may have.
 * pay: [low, high] a day. effects: what a good holder does for the business — { key: [cap, skills…] }.
 */
export const ROLES = {
  ceo: { name: 'Chief Executive Officer', tier: 'executive', employers: ['parent'], keys: ['strategy', 'finance', 'workforce'], limit: 1, pay: [450, 780], sector: null, effects: { overhead: [0.03, 'strategy', 'budgeting'] }, text: 'Sets the group\'s direction and answers for all of it.' },
  cfo: { name: 'Chief Financial Officer', tier: 'executive', employers: ['parent'], keys: ['finance', 'budgeting', 'risk'], limit: 1, pay: [420, 720], sector: null, effects: { overhead: [0.03, 'finance', 'budgeting'] }, text: 'Cash, debt and the discipline of the budget.' },
  coo: { name: 'Chief Operating Officer', tier: 'executive', employers: ['parent'], keys: ['production', 'workforce', 'logistics'], limit: 1, pay: [400, 680], sector: null, effects: { overhead: [0.03, 'production', 'workforce'] }, text: 'Runs the subsidiaries day to day.' },
  controller: { name: 'Chief Financial Controller', tier: 'executive', employers: ['parent'], keys: ['compliance', 'finance', 'budgeting'], limit: 1, pay: [330, 580], sector: null, effects: { overhead: [0.02, 'compliance', 'budgeting'] }, text: 'Books, controls and audits.' },
  cso: { name: 'Chief Strategy Officer', tier: 'executive', employers: ['parent'], keys: ['strategy', 'risk', 'research'], limit: 1, pay: [360, 640], sector: null, effects: {}, text: 'Where to invest next; what to avoid.' },
  cpo: { name: 'Chief Procurement Officer', tier: 'executive', employers: ['parent'], keys: ['procurement', 'inventory', 'finance'], limit: 1, pay: [360, 640], sector: null, effects: { materials: [0.03, 'procurement'], parts: [0.03, 'procurement'] }, text: 'Buys for the whole group.' },
  hrd: { name: 'Human Resources Director', tier: 'executive', employers: ['parent'], keys: ['workforce', 'compliance', 'budgeting'], limit: 1, pay: [300, 540], sector: null, effects: {}, text: 'Recruiting, retention, pay.' },
  gm: { name: 'General Manager', tier: 'manager', employers: B, keys: ['workforce', 'budgeting', 'strategy'], limit: 1, pay: [140, 340], sector: null, effects: { overhead: [0.06, 'budgeting', 'workforce'] }, text: 'Runs the whole business; the only manager a small one needs.' },
  manufacturing_mgr: { name: 'Manufacturing Manager', tier: 'manager', employers: ['arms'], keys: ['production', 'manufacturing', 'workforce'], limit: 1, pay: [130, 320], sector: 'arms', effects: { armsSpeed: [0.07, 'production', 'manufacturing'] }, text: 'The floor: stations kept fed and busy.' },
  logistics_mgr: { name: 'Shipping and Logistics Manager', tier: 'manager', employers: ['shipping'], keys: ['logistics', 'maintenance', 'risk'], limit: 1, pay: [130, 320], sector: 'shipping', effects: { upkeep: [0.1, 'logistics', 'maintenance'] }, text: 'Ships, ports, loads and routes.' },
  aero_ops_mgr: { name: 'Aerospace Operations Manager', tier: 'manager', employers: ['aerospace'], keys: ['aerospace', 'production', 'workforce'], limit: 1, pay: [170, 370], sector: 'aerospace', effects: { overhead: [0.04, 'aerospace', 'production'] }, text: 'Bays, crews and the order of work.' },
  farm_mgr: { name: 'Farm Manager', tier: 'manager', employers: ['farming'], keys: ['agriculture', 'inventory', 'workforce'], limit: 1, pay: [120, 270], sector: 'farming', effects: { farmPrice: [0.06, 'agriculture', 'sales'] }, text: 'Land, herds, harvest and the sale.' },
  sales_mgr: { name: 'Sales and Contracts Manager', tier: 'manager', employers: B, keys: ['sales', 'bidding', 'risk'], limit: 1, pay: [130, 320], sector: null, effects: { farmPrice: [0.03, 'sales', 'bidding'] }, text: 'Wins and prices the work.' },
  procurement_mgr: { name: 'Procurement Manager', tier: 'manager', employers: B, keys: ['procurement', 'inventory', 'budgeting'], limit: 1, pay: [125, 300], sector: null, effects: { materials: [0.05, 'procurement', 'inventory'], parts: [0.06, 'procurement', 'inventory'] }, text: 'Buys materials and parts for less.' },
  rd_mgr: { name: 'Research and Development Manager', tier: 'manager', employers: ['arms', 'aerospace'], keys: ['research', 'strategy', 'risk'], limit: 1, pay: [145, 330], sector: null, effects: {}, text: 'Picks the projects worth the money.' },
  finance_mgr: { name: 'Finance and Accounting Manager', tier: 'manager', employers: B, keys: ['finance', 'budgeting', 'compliance'], limit: 1, pay: [125, 300], sector: null, effects: { overhead: [0.03, 'finance', 'budgeting'] }, text: 'The books, the cash and the forecast.' },
  maintenance_mgr: { name: 'Maintenance Manager', tier: 'manager', employers: ['arms', 'shipping', 'aerospace'], keys: ['maintenance', 'risk', 'workforce'], limit: 1, pay: [120, 270], sector: null, effects: { upkeep: [0.04, 'maintenance', 'risk'] }, text: 'Equipment kept sound; downtime kept short.' },
  accountant: { name: 'Accountant', tier: 'staff', employers: ['parent', ...B], keys: ['finance', 'compliance'], limit: 3, pay: [45, 100], sector: null, effects: {}, text: 'Keeps the ledgers.' },
  analyst: { name: 'Financial Analyst', tier: 'staff', employers: ['parent', ...B], keys: ['finance', 'risk'], limit: 3, pay: [55, 115], sector: null, effects: {}, text: 'Forecasts and comparisons.' },
  procurement_spec: { name: 'Procurement Specialist', tier: 'staff', employers: B, keys: ['procurement', 'inventory'], limit: 3, pay: [45, 100], sector: null, effects: { materials: [0.02, 'procurement'], parts: [0.02, 'procurement'] }, text: 'Chases quotes and suppliers.' },
  supervisor: { name: 'Production Supervisor', tier: 'staff', employers: ['arms', 'aerospace'], keys: ['production', 'workforce'], limit: 3, pay: [55, 115], sector: null, effects: { armsSpeed: [0.02, 'production', 'workforce'] }, text: 'Runs a shift.' },
  coordinator: { name: 'Logistics Coordinator', tier: 'staff', employers: ['shipping'], keys: ['logistics', 'inventory'], limit: 3, pay: [45, 100], sector: 'shipping', effects: { upkeep: [0.02, 'logistics'] }, text: 'Berths, loads, paperwork.' },
  farm_supervisor: { name: 'Farm Supervisor', tier: 'staff', employers: ['farming'], keys: ['agriculture', 'workforce'], limit: 3, pay: [40, 90], sector: 'farming', effects: { farmPrice: [0.02, 'agriculture'] }, text: 'Runs the hands in the field.' },
  sales_rep: { name: 'Sales Representative', tier: 'staff', employers: B, keys: ['sales', 'bidding'], limit: 3, pay: [45, 105], sector: null, effects: {}, text: 'Calls on customers.' },
  maintenance_worker: { name: 'Maintenance Worker', tier: 'staff', employers: ['arms', 'shipping', 'aerospace'], keys: ['maintenance'], limit: 3, pay: [40, 90], sector: null, effects: {}, text: 'Keeps things running.' },
  admin: { name: 'Administrative Staff', tier: 'staff', employers: ['parent', ...B], keys: ['compliance', 'budgeting'], limit: 3, pay: [35, 75], sector: null, effects: {}, text: 'Paper, phones, calendars.' },
};

/** The largest total each effect can ever reach, however many good people there are. */
export const EFFECT_CAPS = { materials: 0.08, parts: 0.1, armsSpeed: 0.1, upkeep: 0.12, farmPrice: 0.08, overhead: 0.1 };
/** What a parent-level executive does for each subsidiary: a share of the effect. */
export const EXEC_REACH = 0.5;

export const MARKET = {
  pool: 24, // candidates kept in the market
  weekLeave: [3, 5], // taken other jobs each week
  fee: 10, // recruiting fee, in days of the salary agreed
  severance: 5, // days of salary on dismissal
  resignUnpaid: 2, // days unpaid in a row before they leave
  promoteDays: 60, // days in a job before a promotion is considered
  xpPerSkill: 3, // good months for a skill point
  maxGains: 6, // skill points a career can add
  skillCap: 90,
  notice: [0, 7, 14],
};

export const FIRST = ['Adair', 'Beck', 'Calla', 'Dorian', 'Edda', 'Fenn', 'Greta', 'Hale', 'Iris', 'Joss', 'Kell', 'Lena', 'Maro', 'Nell', 'Orrin', 'Perrin', 'Quill', 'Rhea', 'Soren', 'Tamsin', 'Una', 'Vesper', 'Wynn', 'Xan', 'Yara', 'Zeb', 'Ansel', 'Brenna', 'Corin', 'Delphi', 'Emrys', 'Fiora', 'Gideon', 'Hester', 'Ingrid', 'Jasper', 'Kestrel', 'Lior', 'Mabel', 'Niall', 'Odessa', 'Pascal', 'Rowan', 'Saskia', 'Torin', 'Ulla', 'Viggo', 'Willa', 'Yusuf', 'Zora'];
export const LAST = ['Ashdown', 'Barrow', 'Cobb', 'Dunmore', 'Eastley', 'Fairweather', 'Garrick', 'Holloway', 'Ibbotson', 'Jarrow', 'Kingsley', 'Lockhart', 'Marlowe', 'Nightingale', 'Okonkwo', 'Pembroke', 'Quayle', 'Radcliffe', 'Sandoval', 'Thorne', 'Underhill', 'Vance', 'Whitlock', 'Yarrow', 'Zielinski', 'Abernathy', 'Brandt', 'Castellan', 'Draycott', 'Ellery', 'Foxley', 'Gallagher', 'Hartwell', 'Iverson', 'Jessop', 'Kovacs', 'Lindgren', 'Mercer', 'Novak', 'Oakes', 'Prowse', 'Rask', 'Strand', 'Tanaka', 'Voss', 'Wexford', 'Yoon', 'Zaleski'];
export const EDUCATION = {
  executive: ['an MBA from the Halvermouth School of Commerce', 'a law degree and a CPA', 'a doctorate in economics', 'an engineering degree and a business diploma'],
  manager: ['a diploma in operations management', 'a degree in engineering', 'a degree in accounting', 'a trade apprenticeship and night school', 'a degree in logistics'],
  staff: ['a trade certificate', 'a clerical diploma', 'on-the-job training', 'a bookkeeping course', 'a technical certificate'],
};
export const STYLES = {
  cautious: 'Careful with money and slow to commit; prefers to hold back rather than gamble.',
  balanced: 'Weighs gains against risks; steady in a crisis.',
  aggressive: 'Pushes for growth and takes risks others would not; fond of a big contract.',
  meticulous: 'Checks every figure twice; thorough, and slow.',
  driven: 'Works hard and expects the same; can wear a crew down.',
};
