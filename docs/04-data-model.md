# TurtWatch — Data Model

Conceptual model (storage-agnostic). See `10-database-schema.sql` for SQL and
`src/types` for the TypeScript mirror used by the prototype.

## Entities

### User
| field | type | notes |
|---|---|---|
| id | uuid | pk |
| displayName | string | |
| email | string? | for cloud sync (P1) |
| createdAt | timestamp | |
| timezone | string | IANA, drives "today" |
| mascot | enum(`turtley`,`shelldon`) | |
| mascotName | string? | user nickname |
| themeId | string | equipped theme |
| isPremium | bool | |

### TurtbuxWallet (1:1 with User)
| field | type | notes |
|---|---|---|
| userId | uuid | pk/fk |
| balance | int | denormalized cache of ledger sum |
| lifetimeEarned | int | |
| lifetimeSpent | int | |

### TurtbuxLedgerEntry (append-only)
| field | type | notes |
|---|---|---|
| id | uuid | pk |
| userId | uuid | fk |
| delta | int | + earn / − spend |
| reason | enum | `upload`,`streak_bonus`,`note_bonus`,`challenge`,`fact_read`,`repair`,`ai_rescue`,`shield_buy`,`shop_purchase`,`onboarding_gift`,`refund`,`admin` |
| refType | string? | e.g. `entry`,`fact`,`shopItem` |
| refId | string? | |
| balanceAfter | int | snapshot |
| createdAt | timestamp | |

### TurtleEntry (one per day max)
| field | type | notes |
|---|---|---|
| id | uuid | pk |
| userId | uuid | fk |
| date | date | local date; UNIQUE(userId,date) |
| state | enum | `completed`,`repaired`,`ai_rescued`,`shielded` |
| photoUrl | string? | null when shielded-only |
| photoSource | enum | `camera`,`library`,`sample`,`ai` |
| turtleName | string? | |
| mood | enum? | `happy`,`sleepy`,`derpy`,`majestic`,`shy`,`hungry` |
| notes | text? | |
| tags | string[] | |
| location | {lat,lng,label}? | optional |
| earnedTurtbux | int | recorded at creation |
| createdAt / updatedAt | timestamp | |

> A **missed** day is the *absence* of a row for a past date — not stored.
> A **shielded** day stores a row with `state=shielded` and no photo.

### Streak (1:1 cache; recomputable from entries)
| field | type | notes |
|---|---|---|
| userId | uuid | pk/fk |
| current | int | |
| longest | int | |
| lastCompletedDate | date? | |
| freezeCount | int | shields currently protecting (info) |

### ShellShield (inventory)
| field | type | notes |
|---|---|---|
| id | uuid | pk |
| userId | uuid | fk |
| status | enum | `available`,`used` |
| acquiredAt | timestamp | |
| usedOnDate | date? | |
| autoApply | bool | user pref snapshot |

### TurtleFact
| field | type | notes |
|---|---|---|
| id | string | pk (slug) |
| title | string | |
| body | text | |
| category | enum | `biology`,`history`,`record`,`silly`,`care` |
| graphicKey | string | illustration asset key |
| rarity | enum | `common`,`rare`,`legendary` |
| reward | int | Turtbux on first read |

### UserFactRead
| field | type | notes |
|---|---|---|
| userId+factId | composite pk | |
| readAt | timestamp | |

### ShopItem
| field | type | notes |
|---|---|---|
| id | string | pk |
| category | enum | `theme`,`sticker`,`frame`,`mascot_accessory`,`shield`,`recovery` |
| name | string | |
| price | int | Turtbux |
| previewKey | string | |
| consumable | bool | shields/recovery are consumable |
| premiumOnly | bool | |

### UserInventory (owned/equipped cosmetics)
| field | type | notes |
|---|---|---|
| userId+itemId | composite pk | |
| equipped | bool | for themes/frames/accessories |
| acquiredAt | timestamp | |

### Challenge & UserChallengeProgress (P1)
| Challenge | id, title, goalType, goalCount, reward, startsAt, endsAt |
| Progress | userId, challengeId, progress, completedAt? |

### Achievement & UserAchievement
| Achievement | id, title, description, iconKey, criteria |
| UserAchievement | userId, achievementId, earnedAt |

### NotificationSettings
| field | type |
|---|---|
| userId | fk |
| dailyReminderEnabled | bool |
| reminderTime | "HH:mm" |
| streakRiskEnabled | bool |
| factOfDayEnabled | bool |

## Relationships
- User 1—1 Wallet, Streak, NotificationSettings.
- User 1—N TurtleEntry, LedgerEntry, ShellShield, UserInventory, UserFactRead.
- ShopItem N—N User via UserInventory; TurtleFact N—N User via UserFactRead.
