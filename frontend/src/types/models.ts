export type Person = {
  id: string;
  name: string;
};

export type BillItem = {
  id: string;
  name: string;
  price: number;
  assignedTo: string;
};

export type SplitPerson = {
  id?: string;
  name: string;
  amount: number;
  paid?: boolean;
};

export type SplitItem = {
  id?: string;
  item_name: string;
  price: number;
  assigned_to?: string | null;
};

export type SavedSplit = {
  id: string;
  title: string;
  total_amount: number;
  mode: 'equal' | 'smart';
  created_at?: string;
  people: SplitPerson[];
  items: SplitItem[];
};

export type User = {
  id: string;
  email: string;
};
