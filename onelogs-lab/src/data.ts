import { config } from './config';
import { createRng } from './rng';

export type Role = 'customer' | 'support';

export interface User {
  id: string;
  username: string;
  password: string;
  role: Role;
  displayName: string;
  email: string;
  phone: string;
  address: string;
}
export interface Product {
  sku: string;
  name: string;
  category: string;
  price: number;
  description: string;
}
export interface Order {
  id: number;
  owner_id: string;
  items: { sku: string; qty: number; price: number }[];
  total: number;
  status: string;
  shipping_address: string;
  created_at: string;
}
export interface Dataset {
  users: User[];
  usersById: Map<string, User>;
  usersByName: Map<string, User>;
  orders: Map<number, Order>;
  ordersByOwner: Map<string, Order[]>;
  products: Product[];
}

const FIRST = [
  'Ava',
  'Liam',
  'Noah',
  'Mia',
  'Zoe',
  'Ethan',
  'Isla',
  'Arjun',
  'Priya',
  'Kenji',
  'Sara',
  'Omar',
];
const LAST = [
  'Stone',
  'Rivera',
  'Khan',
  'Novak',
  'Okafor',
  'Silva',
  'Chen',
  'Mehta',
  'Larsen',
  'Haddad',
];
const ADJ = [
  'Compact',
  'Rugged',
  'Ergonomic',
  'Wireless',
  'Premium',
  'Classic',
  'Smart',
  'Portable',
  'Eco',
];
export const PRODUCT_NOUNS = [
  'Backpack',
  'Headphones',
  'Keyboard',
  'Lamp',
  'Bottle',
  'Charger',
  'Monitor',
  'Notebook',
  'Speaker',
  'Jacket',
  'Mug',
  'Chair',
];
const CATEGORIES = ['electronics', 'home', 'outdoor', 'office', 'apparel'];
const LOREM =
  'lorem ipsum dolor sit amet consectetur adipiscing elit sed do eiusmod tempor incididunt ut labore et dolore magna aliqua'.split(
    ' ',
  );
const STATUSES = ['processing', 'shipped', 'delivered'];

export const ORDER_ID_MIN = 1001; // sequential ids on purpose: easy to enumerate

export function buildDataset(seed: number): Dataset {
  const rng = createRng(seed);

  const users: User[] = [];
  const TOTAL = 30;
  const SUPPORT = 2;
  for (let i = 1; i <= TOTAL; i++) {
    const n = String(i).padStart(3, '0');
    const first = rng.pick(FIRST);
    const last = rng.pick(LAST);
    users.push({
      id: `u_${n}`,
      username: `user${n}`,
      password: `pw-user${n}`,
      role: i > TOTAL - SUPPORT ? 'support' : 'customer',
      displayName: `${first} ${last}`,
      email: `${first}.${last}${n}@example.test`.toLowerCase(),
      phone: `+1-555-01${n.slice(1)}`,
      address: `${rng.int(10, 999)} ${rng.pick(LAST)} St`,
    });
  }

  const products: Product[] = Array.from({ length: 400 }, (_, i) => ({
    sku: `SKU-${String(i + 1).padStart(4, '0')}`,
    name: `${rng.pick(ADJ)} ${rng.pick(PRODUCT_NOUNS)}`,
    category: rng.pick(CATEGORIES),
    price: Math.round(rng.float(5, 400) * 100) / 100,
    description: Array.from({ length: rng.int(10, 60) }, () =>
      rng.pick(LOREM),
    ).join(' '),
  }));

  const customers = users.filter((u) => u.role === 'customer');
  const owners: string[] = [];
  for (const u of customers)
    for (let k = rng.int(2, 6); k > 0; k--) owners.push(u.id);

  const usersById = new Map(users.map((u) => [u.id, u]));
  const orders = new Map<number, Order>();
  const ordersByOwner = new Map<string, Order[]>();
  rng.shuffle(owners).forEach((ownerId, i) => {
    const items = Array.from({ length: rng.int(1, 4) }, () => {
      const p = rng.pick(products);
      return { sku: p.sku, qty: rng.int(1, 3), price: p.price };
    });
    const order: Order = {
      id: ORDER_ID_MIN + i,
      owner_id: ownerId,
      items,
      total:
        Math.round(items.reduce((s, it) => s + it.qty * it.price, 0) * 100) /
        100,
      status: rng.pick(STATUSES),
      shipping_address: usersById.get(ownerId)!.address,
      created_at: new Date(
        Date.UTC(2026, 0, 1) + rng.int(0, 270) * 86_400_000,
      ).toISOString(),
    };
    orders.set(order.id, order);
    ordersByOwner.set(ownerId, [...(ordersByOwner.get(ownerId) ?? []), order]);
  });

  return {
    users,
    usersById,
    usersByName: new Map(users.map((u) => [u.username, u])),
    orders,
    ordersByOwner,
    products,
  };
}

export const dataset = buildDataset(config.seed);
export const ORDER_ID_MAX = ORDER_ID_MIN + dataset.orders.size - 1;

export const publicUser = ({ password: _pw, ...rest }: User) => rest;
