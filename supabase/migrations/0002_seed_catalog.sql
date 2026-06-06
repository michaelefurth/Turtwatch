-- TurtWatch — seed global content catalogs (facts, shop items, achievements).
-- Mirrors src/data/*.ts. Safe to re-run (upserts).

-- ---------------- turtle facts ----------------
insert into turtle_fact (id, title, body, category, emoji, rarity, reward) values
  ('no-teeth','Toothless Wonders','Turtles have no teeth! They use a sharp, beak-like mouth to chomp their food.','biology','🦷','common',5),
  ('breathe-butt','Bum Breathers','Some turtles can absorb oxygen through their rear end — cloacal respiration! Truly elite.','silly','🍑','rare',10),
  ('shell-bones','Built-in Backpack','A turtle''s shell is fused to its spine and ribs — it can''t ever leave home without it.','biology','🎒','common',5),
  ('ancient','Older Than Dinosaurs','Turtles have been around for over 200 million years, predating snakes and crocodiles.','history','🦕','rare',10),
  ('oldest','Jonathan the Tortoise','Jonathan, a Seychelles tortoise, is ~190+ years old — possibly the oldest land animal alive.','record','🎂','legendary',25),
  ('tears','Salty Criers','Sea turtles ''cry'' to flush out extra salt. Not sad — just very well hydrated.','biology','😢','common',5),
  ('navigation','Magnetic Maps','Sea turtles sense Earth''s magnetic field to navigate thousands of miles back to their birth beach.','biology','🧭','rare',10),
  ('temperature-sex','Warm = Girls','For many turtles, nest temperature decides the babies'' sex. Warmer sand → more females.','biology','🌡️','common',5),
  ('fast-leatherback','Speedy Swimmer','Leatherback sea turtles can swim up to 35 km/h — faster than you''d ever guess.','record','💨','rare',10),
  ('group-name','A Bale of Turtles','A group of turtles is called a ''bale.'' A bale of turtles. Say it again. Lovely.','silly','👯','common',5),
  ('care-basking','Sunbathing Pros','Pet turtles need a basking spot with UVB light to stay healthy and build strong shells.','care','☀️','common',5),
  ('care-clean','Clean Pond Club','Turtles are messy! A good filter keeps their water clear and their little selves happy.','care','🫧','common',5),
  ('tiny-speck','Smallest Turtle','The speckled padloper tortoise fits in your palm at under 10 cm. Pocket-sized perfection.','record','🤏','rare',10),
  ('biggest','Gentle Giant','Leatherbacks can weigh over 900 kg — a turtle the size of a small car.','record','🚗','legendary',25),
  ('hibernate','Pond Naps','Some turtles brumate (reptile hibernation) underwater all winter. The original cozy nappers.','biology','😴','common',5),
  ('shell-feel','Shells Can Feel','A shell isn''t armor-armor — it has nerve endings. Turtles can feel a gentle scratch.','biology','🫶','common',5)
on conflict (id) do update set
  title = excluded.title, body = excluded.body, category = excluded.category,
  emoji = excluded.emoji, rarity = excluded.rarity, reward = excluded.reward;

-- ---------------- shop items ----------------
insert into shop_item (id, category, name, description, price, emoji, consumable, theme) values
  ('buy_shield','shield','Shell Shield','Protects one missed day so your streak survives. Stock up!',80,'🛡️',true,null),
  ('shield_pack_3','shield','Shield Pack ×3','Three Shell Shields at once — stock up for a long trip.',210,'🛡️',true,null),
  ('frame_lilypad','frame','Lily Pad Frame','Frame your daily turtle on a floating lily pad.',120,'🪷',false,null),
  ('frame_bubbles','frame','Bubble Frame','Surround your turtle with happy little bubbles.',120,'🫧',false,null),
  ('frame_gold','frame','Golden Shell Frame','For your most majestic turtles only.',220,'🥇',false,null),
  ('sticker_pond','sticker','Pond Pals Pack','Frogs, ducks & dragonflies to decorate entries.',100,'🐸',false,null),
  ('sticker_party','sticker','Party Pack','Confetti, balloons & party hats. Wholesome chaos.',100,'🎉',false,null),
  ('acc_party_hat','mascot_accessory','Party Hat','A tiny party hat for your mascot.',90,'🎩',false,null),
  ('acc_sunnies','mascot_accessory','Cool Sunnies','Sunglasses. Your mascot is now extremely cool.',120,'🕶️',false,null),
  ('acc_crown','mascot_accessory','Royal Crown','Crown your mascot the ruler of the pond.',250,'👑',false,null),
  ('frame_starlight','frame','Starlight Frame','A dreamy sparkle border for cosmic turtles.',200,'✨',false,null),
  ('frame_rainbow','frame','Rainbow Frame','A soft rainbow halo around your turtle.',200,'🌈',false,null),
  ('sticker_food','sticker','Snack Pack','Strawberries, lettuce & little cakes for hungry turtles.',100,'🍓',false,null),
  ('acc_bow','mascot_accessory','Cute Bow','An adorable bow for a dapper turtle.',90,'🎀',false,null),
  ('acc_flower','mascot_accessory','Flower Crown','A springtime flower for your mascot''s head.',110,'🌷',false,null),
  ('acc_scarf','mascot_accessory','Cozy Scarf','Keep your turtle snug and stylish.',140,'🧣',false,null),
  ('theme_seafoam','theme','Seafoam','A cozy new pond palette for the whole app.',310,'🎨',false,
    '{"id":"seafoam","name":"Seafoam","bg":"#e6fbf6","surface":"#ffffff","primary":"#8fe0d2","primaryDeep":"#2f8a78","accent":"#ffd0a5","text":"#244f49"}'),
  ('theme_bubblegum','theme','Bubblegum Pond','A cozy new pond palette for the whole app.',150,'🎨',false,
    '{"id":"bubblegum","name":"Bubblegum Pond","bg":"#fdeef4","surface":"#ffffff","primary":"#f7a8c4","primaryDeep":"#c14d77","accent":"#bfe3ff","text":"#5b3346"}'),
  ('theme_lilac_lagoon','theme','Lilac Lagoon','A cozy new pond palette for the whole app.',190,'🎨',false,
    '{"id":"lilac_lagoon","name":"Lilac Lagoon","bg":"#f1ecfb","surface":"#ffffff","primary":"#c3b3f0","primaryDeep":"#6f57bd","accent":"#ffe1a8","text":"#423a5e"}'),
  ('theme_sunny_sand','theme','Sunny Sandbar','A cozy new pond palette for the whole app.',230,'🎨',false,
    '{"id":"sunny_sand","name":"Sunny Sandbar","bg":"#fff6e6","surface":"#ffffff","primary":"#ffcf73","primaryDeep":"#b3760f","accent":"#9fdcc0","text":"#5a4422"}'),
  ('theme_deep_sea','theme','Deep Blue','A cozy new pond palette for the whole app.',270,'🎨',false,
    '{"id":"deep_sea","name":"Deep Blue","bg":"#e8f1fb","surface":"#ffffff","primary":"#8fbdf0","primaryDeep":"#2f66b8","accent":"#ffc4d6","text":"#2d4360"}')
on conflict (id) do update set
  category = excluded.category, name = excluded.name, description = excluded.description,
  price = excluded.price, emoji = excluded.emoji, consumable = excluded.consumable, theme = excluded.theme;

-- ---------------- achievements ----------------
-- mirrors src/data/achievements.ts (kept in sync)
insert into achievement (id, title, description, emoji) values
  ('first_turtle','First Turtle!','Upload your very first turtle.','🐢'),
  ('streak_7','Week of Turtles','Reach a 7-day streak.','📅'),
  ('streak_30','Turtle Devotee','Reach a 30-day streak.','🏆'),
  ('streak_100','Pond Legend','Reach a 100-day streak.','💯'),
  ('first_repair','Handy Helper','Repair a missed day.','🩹'),
  ('first_shield','Shell Guardian','Use a Shell Shield.','🛡️'),
  ('first_rescue','AI Whisperer','Use AI Turtle Rescue.','✨'),
  ('facts_5','Curious Turtle','Collect 5 fact cards.','📖'),
  ('facts_all','Turtle Scholar','Collect 100 fact cards.','🎓'),
  ('pondex','Complete Pondex','Collect every fact card.','🏅'),
  ('fact_collector','Real-Deal Collector','Collect a genuine turtle-fact card.','🃏'),
  ('shopper','Pond Shopper','Buy your first shop item.','🛍️'),
  ('rich','Turtbux Tycoon','Earn 1,500 Turtbux in total.','🪙'),
  ('decorator','Cozy Decorator','Equip a theme, frame, and accessory.','🎨'),
  ('first_flip','Flip Friend','Win your first Turtle Flip game.','🎴'),
  ('flip_master','Flip Master','Win 10 Turtle Flip games.','🃏'),
  ('first_mantra','Deep Breath','Complete your first mantra focus.','🧘'),
  ('zen_master','Pond Zen','Complete 25 mantra focuses.','🌸'),
  ('first_task','Goal Starter','Complete your first daily goal.','✅'),
  ('goal_getter','Goal Getter','Reach a 7-day goal streak.','🎯'),
  ('globetrotter','Globetrotter','Reach 10 places on your trek.','🗺️')
on conflict (id) do update set
  title = excluded.title, description = excluded.description, emoji = excluded.emoji;
