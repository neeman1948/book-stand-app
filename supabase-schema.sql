create extension if not exists "pgcrypto";

create table if not exists public.books (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  author text not null default '',
  barcode text unique,
  category text not null default 'אחר',
  price numeric not null default 0,
  original_price numeric,
  stock integer not null default 0,
  sold integer not null default 0,
  description text not null default '',
  notes text not null default '',
  purchase_cost numeric,
  purchase_source text not null default '',
  image_url text not null default '',
  is_new boolean not null default false,
  is_on_sale boolean not null default false,
  show_in_slideshow boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.books add column if not exists author text not null default '';
alter table public.books alter column barcode drop not null;
alter table public.books add column if not exists category text not null default 'אחר';
alter table public.books add column if not exists original_price numeric;
alter table public.books add column if not exists description text not null default '';
alter table public.books add column if not exists notes text not null default '';
alter table public.books add column if not exists purchase_cost numeric;
alter table public.books add column if not exists purchase_source text not null default '';
alter table public.books add column if not exists image_url text not null default '';
alter table public.books add column if not exists is_new boolean not null default false;
alter table public.books add column if not exists is_on_sale boolean not null default false;
alter table public.books add column if not exists show_in_slideshow boolean not null default false;
alter table public.books add column if not exists created_at timestamptz not null default now();
alter table public.books add column if not exists updated_at timestamptz not null default now();

create table if not exists public.book_orders (
  id uuid primary key default gen_random_uuid(),
  customer_name text not null default '',
  title text not null,
  phone text not null,
  notes text not null default '',
  status text not null default 'new',
  is_paid boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.book_orders add column if not exists customer_name text not null default '';
alter table public.book_orders add column if not exists notes text not null default '';
alter table public.book_orders add column if not exists status text not null default 'new';
alter table public.book_orders add column if not exists is_paid boolean not null default false;

create table if not exists public.settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  book_id uuid,
  barcode text not null,
  title text not null,
  price numeric not null default 0,
  quantity integer not null default 1,
  total_price numeric not null default 0,
  purchase_group_id uuid,
  created_at timestamptz not null default now()
);

alter table public.sales add column if not exists quantity integer not null default 1;
alter table public.sales add column if not exists total_price numeric not null default 0;
alter table public.sales add column if not exists purchase_group_id uuid;

do $$
begin
  alter publication supabase_realtime add table public.books;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.book_orders;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.settings;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.sales;
exception when duplicate_object then null;
end $$;

insert into public.settings (key, value)
values
  ('business', '{"name":"ספרים בדוכן","tagline":"סרקו ברקוד או חפשו ספר כדי לדעת מחיר מיד."}'),
  ('categories', '["ספרות","ילדים","עיון","לימוד","אחר"]'),
  ('slideshow', '{"enabled":true,"idleSeconds":45,"slideSeconds":6,"items":[]}'),
  ('traderPrices', '[]'),
  ('promotions', '[{"title":"3 ספרים ב-100","details":"תקף לספרים משתתפים במבצע.","imageUrl":"","isActive":true,"sortOrder":1},{"title":"ספרי ילדים מ-35 ₪","details":"חפשו לפי שם הספר או סרקו ברקוד למחיר מדויק.","imageUrl":"","isActive":true,"sortOrder":2}]'),
  ('payment', '{"bitQrUrl":"","bitDetails":"אפשר לשלם ב-Bit לפי המספר שמופיע בדוכן.","bankDetails":"פרטי העברה בנקאית יופיעו כאן.","notes":"לאחר תשלום סמנו רכישה כדי שהמלאי יתעדכן."}'),
  ('about', '{"title":"על הדוכן","text":"כאן יופיע מידע על העסק, שעות פעילות, מדיניות החלפה וכל דבר שחשוב ללקוחות לדעת."}'),
  ('security', '{"adminPin":""}')
on conflict (key) do update set value = excluded.value, updated_at = now();

insert into public.books (title, author, barcode, category, price, original_price, stock, sold, description, notes, image_url, is_new, created_at)
values
  ('הארי פוטר ואבן החכמים', 'ג''יי קיי רולינג', '9789654487652', 'ספרות', 45, 65, 4, 0, 'עותק קריאה נוח לנוער ולמבוגרים.', '', '', true, now() - interval '2 days'),
  ('קיצור תולדות האנושות', 'יובל נח הררי', '9789655455308', 'עיון', 65, 89, 3, 0, '', '', '', false, now() - interval '8 days'),
  ('דירה להשכיר', 'לאה גולדברג', '9789650701066', 'ילדים', 35, 45, 6, 0, 'ספר ילדים קלאסי.', '', '', true, now() - interval '1 day'),
  ('אליפים', 'אסתר שטרייט-וורצל', '9789650710037', 'ספרות', 30, 40, 2, 0, '', '', '', false, now() - interval '15 days')
on conflict (barcode) do nothing;
