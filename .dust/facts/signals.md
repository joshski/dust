# Signals

Dust refers to its primary artifacts (goals, facts, ideas and tasks) as "signals" — stored in the [`.dust/` directory](./dust-directory-structure.md).

One way to think of these is as a progression from stable/abstract to volatile/concrete:

```
 Stable                                     Abstract
   ▲                                            ▲
   │                                            │
   │   Goals ←── Pages should load quickly      │
   │                    ↑                       │
   │   Facts ←── Read queries are optimised     │
   │                    ↑                       │
   │   Ideas ←── Fine-tune user/orders queries  │
   │                    ↑                       │
   │   Tasks ←── Add index on orders.user_id    │
   │                                            │
   ▼                                            ▼
Volatile                                     Concrete
```
