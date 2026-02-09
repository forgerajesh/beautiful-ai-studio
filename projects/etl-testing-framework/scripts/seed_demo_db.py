import sqlite3
from datetime import datetime, timedelta

DB = "demo_etl.db"
conn = sqlite3.connect(DB)
cur = conn.cursor()

cur.executescript(
    """
    drop table if exists source_orders;
    drop table if exists target_orders;
    drop table if exists dim_customer_hist;

    create table source_orders (
      order_id integer primary key,
      customer_id integer not null,
      amount real not null,
      updated_at text not null
    );

    create table target_orders (
      order_id integer primary key,
      customer_id integer not null,
      amount real not null,
      updated_at text not null
    );

    create table dim_customer_hist (
      customer_id integer not null,
      version integer not null,
      is_current integer not null,
      valid_from text not null,
      valid_to text
    );
    """
)

now = datetime.utcnow()
orders = [
    (1, 101, 100.0, (now - timedelta(minutes=10)).isoformat()),
    (2, 102, 250.0, (now - timedelta(minutes=20)).isoformat()),
    (3, 103, 75.0, (now - timedelta(minutes=30)).isoformat()),
]

cur.executemany("insert into source_orders values (?,?,?,?)", orders)
cur.executemany("insert into target_orders values (?,?,?,?)", orders)

scd_rows = [
    (101, 1, 0, "2024-01-01", "2024-12-31"),
    (101, 2, 1, "2025-01-01", None),
    (102, 1, 1, "2025-01-01", None),
    (103, 1, 1, "2025-01-01", None),
]
cur.executemany("insert into dim_customer_hist values (?,?,?,?,?)", scd_rows)

conn.commit()
conn.close()
print(f"Seeded demo database: {DB}")
