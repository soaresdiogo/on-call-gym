# duplicate-webhook · The same webhook ships the order twice

> **WAREHOUSE REPORT**
>
> "We packed two parcels for order 7f3c..., the customer paid for one." Finance confirms one
> charge. The payment provider's dashboard shows the `payment.succeeded` event for that order
> delivered twice, two seconds apart, both acknowledged with 200.

**Your goal:** each payment event ships its order once, no matter how many times it arrives.

**Level:** mid · **Track:** incident
