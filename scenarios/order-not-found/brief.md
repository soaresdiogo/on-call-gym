# order-not-found · Looking up an unknown order returns 500

> **ALERT** · `http-5xx-rate` above 2% on `GET /orders/:orderId`
>
> Error budget is burning on the order tracking endpoint. Support says some customers paste an
> old or mistyped tracking link and get "Something went wrong". Real orders open fine.

**Your goal:** unknown orders get the right answer, known orders keep working.

**Level:** junior · **Track:** incident
