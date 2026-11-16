# retry-storm · Checkout errors while payment calls explode

> **ALERT** · `checkout-success-rate` below 50% for 5 minutes
>
> Customers report "payment failed, try again" at checkout. Traffic from customers is flat:
> about 20 checkouts per second, same as yesterday. The payment provider's status page says
> "degraded performance, all requests are being processed". Their account manager just called
> to ask why our call volume to them is several times higher than usual.

**Your goal:** checkouts succeed again while the provider is still slow, without hammering it.

**Level:** mid · **Track:** incident
