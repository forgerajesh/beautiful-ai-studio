from framework.runner_context import RunnerContext

ctx = RunnerContext("config/tests.yaml")
adapter = ctx.adapter

for table in ["source_orders", "target_orders", "dim_customer_hist"]:
    schema = adapter.table_schema(table)
    print(f"\n=== {table} ===")
    print(ctx.ai.suggest_additional_tests(table, schema))
