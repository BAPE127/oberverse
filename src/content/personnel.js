// The people who run your companies (v0.89.0). Three jobs, one flat wage each, no skills and no candidates: you hire, they work.
// Everything here is data; src/systems/personnel.js turns it into hires, payroll and what a manager does for a business, and
// src/systems/management.js into what they decide for themselves. Pay is obols a day.

const B = ['arms', 'shipping', 'aerospace', 'farming'];

/** The jobs. tier is where they sit (manager: at a business; executive/staff: at the parent). limit: how many one employer may have. */
export const ROLES = {
  manager: { name: 'Manager', tier: 'manager', employers: B, limit: 1, text: 'Runs the business day to day in its own interest: buys supplies, takes contracts, starts research, and asks you before it expands. You choose what it may do.' },
  group_manager: { name: 'Group manager', tier: 'executive', employers: ['parent'], limit: 1, text: 'Keeps the parent\'s cash and its companies\' cash where they should be, in the group\'s interest.' },
  office: { name: 'Office staff', tier: 'staff', employers: ['parent'], limit: 99, text: 'Sits at a desk in your headquarters. Fills a seat and does nothing else.' },
};

/** What each job pays a day, by where it works: the same for every person, because nobody has a skill. */
export const WAGES = { manager: { arms: 220, shipping: 220, aerospace: 270, farming: 180 }, group_manager: { parent: 400 }, office: { parent: 60 } };
export const wageOf = (role, employer) => WAGES[role]?.[employer] ?? 0;

/** What a manager does for a business just by being there: the same for every manager (a share of what that business buys or sells). */
export const PERKS = { arms: { armsSpeed: 0.03, parts: 0.03 }, aerospace: { materials: 0.03 }, shipping: { upkeep: 0.03 }, farming: { farmPrice: 0.03 } };

/** The things a person may be allowed to do on their own — the checkboxes. Anything unticked they never do. */
export const PERM_NAMES = {
  reorder: { name: 'Buy supplies', text: 'Orders parts and materials when the stock runs low.' },
  bid: { name: 'Take contracts', text: 'Bids for tenders at a fair margin over what the work costs.' },
  research: { name: 'Research', text: 'Starts the next research when none is under way.' },
  expand: { name: 'Expand', text: 'Proposes buying or building more. It always asks you first.' },
  transfer: { name: 'Move cash', text: 'Tops a company up from the parent, or brings its extra cash back.' },
};
/** Which of them each job has at each place. */
export const PERMS = { manager: { arms: ['reorder', 'research', 'expand'], aerospace: ['reorder', 'bid', 'research', 'expand'], shipping: ['expand'], farming: ['expand'] }, group_manager: { parent: ['transfer'] }, office: { parent: [] } };
export const permsFor = (role, employer) => PERMS[role]?.[employer] || [];

export const MARKET = {
  fee: 10, // signing fee, in days of the wage
  severance: 5, // days of wage on dismissal
  resignUnpaid: 2, // days unpaid in a row before they leave
};

export const FIRST = ['Adair', 'Beck', 'Calla', 'Dorian', 'Edda', 'Fenn', 'Greta', 'Hale', 'Iris', 'Joss', 'Kell', 'Lena', 'Maro', 'Nell', 'Orrin', 'Perrin', 'Quill', 'Rhea', 'Soren', 'Tamsin', 'Una', 'Vesper', 'Wynn', 'Xan', 'Yara', 'Zeb', 'Ansel', 'Brenna', 'Corin', 'Delphi', 'Emrys', 'Fiora', 'Gideon', 'Hester', 'Ingrid', 'Jasper', 'Kestrel', 'Lior', 'Mabel', 'Niall', 'Odessa', 'Pascal', 'Rowan', 'Saskia', 'Torin', 'Ulla', 'Viggo', 'Willa', 'Yusuf', 'Zora'];
export const LAST = ['Ashdown', 'Barrow', 'Cobb', 'Dunmore', 'Eastley', 'Fairweather', 'Garrick', 'Holloway', 'Ibbotson', 'Jarrow', 'Kingsley', 'Lockhart', 'Marlowe', 'Nightingale', 'Okonkwo', 'Pembroke', 'Quayle', 'Radcliffe', 'Sandoval', 'Thorne', 'Underhill', 'Vance', 'Whitlock', 'Yarrow', 'Zielinski', 'Abernathy', 'Brandt', 'Castellan', 'Draycott', 'Ellery', 'Foxley', 'Gallagher', 'Hartwell', 'Iverson', 'Jessop', 'Kovacs', 'Lindgren', 'Mercer', 'Novak', 'Oakes', 'Prowse', 'Rask', 'Strand', 'Tanaka', 'Voss', 'Wexford', 'Yoon', 'Zaleski'];
