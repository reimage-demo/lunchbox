(function () {
  const fallbackMenu = [
  {
    "_id": "m1",
    "name": "Jerk Chicken Lunch Box",
    "category": "Lunch Boxes",
    "description": "Smoky jerk chicken with rice and peas and your choice of cabbage or fried plantain.",
    "price": 1500,
    "accent": "Customer favorite",
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/2280de72-abd9-4f20-bcba-f064361cf21d",
    "isAvailable": true,
    "isFeatured": true,
    "categorySortOrder": 1,
    "sortOrder": 1,
    "sizes": [],
    "showsStartingPrice": false,
    "optionGroups": [
      {
        "_id": "g-included-side",
        "name": "Choose your included side",
        "description": "Rice and peas come with your box. Choose one extra side.",
        "selectionMode": "single",
        "minSelections": 1,
        "maxSelections": 1,
        "options": [
          {
            "id": "cabbage",
            "name": "Cabbage",
            "description": "",
            "price": 0
          },
          {
            "id": "plantain",
            "name": "Fried plantain",
            "description": "",
            "price": 0
          }
        ]
      }
    ]
  },
  {
    "_id": "m2",
    "name": "Curry Chicken Lunch Box",
    "category": "Lunch Boxes",
    "description": "Slow-cooked curry chicken with rice and peas and your choice of cabbage or fried plantain.",
    "price": 1500,
    "accent": "Comfort food",
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/b5821195-99f3-41f2-a2be-fe7f52971b80",
    "isAvailable": true,
    "isFeatured": true,
    "categorySortOrder": 1,
    "sortOrder": 2,
    "sizes": [],
    "showsStartingPrice": false,
    "optionGroups": [
      {
        "_id": "g-included-side",
        "name": "Choose your included side",
        "description": "Rice and peas come with your box. Choose one extra side.",
        "selectionMode": "single",
        "minSelections": 1,
        "maxSelections": 1,
        "options": [
          {
            "id": "cabbage",
            "name": "Cabbage",
            "description": "",
            "price": 0
          },
          {
            "id": "plantain",
            "name": "Fried plantain",
            "description": "",
            "price": 0
          }
        ]
      }
    ]
  },
  {
    "_id": "m3",
    "name": "Escovitch Fish Lunch Box",
    "category": "Lunch Boxes",
    "description": "Escovitch fish with bright pickled peppers, rice and peas and your choice of cabbage or fried plantain.",
    "price": 1500,
    "accent": "Made fresh",
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/07c85254-9419-4216-a8e8-70b0a1bc902d",
    "isAvailable": true,
    "categorySortOrder": 1,
    "sortOrder": 3,
    "sizes": [],
    "showsStartingPrice": false,
    "optionGroups": [
      {
        "_id": "g-included-side",
        "name": "Choose your included side",
        "description": "Rice and peas come with your box. Choose one extra side.",
        "selectionMode": "single",
        "minSelections": 1,
        "maxSelections": 1,
        "options": [
          {
            "id": "cabbage",
            "name": "Cabbage",
            "description": "",
            "price": 0
          },
          {
            "id": "plantain",
            "name": "Fried plantain",
            "description": "",
            "price": 0
          }
        ]
      }
    ]
  },
  {
    "_id": "m4",
    "name": "Steamed Fish Lunch Box",
    "category": "Lunch Boxes",
    "description": "Fish steamed with herbs and vegetables, served with rice and peas and your choice of cabbage or fried plantain.",
    "price": 1500,
    "accent": "Cooked to order",
    "isAvailable": true,
    "categorySortOrder": 1,
    "sortOrder": 4,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/ca8e9b1f-095a-45c8-b4ce-02069d13f3b9",
    "sizes": [],
    "showsStartingPrice": false,
    "optionGroups": [
      {
        "_id": "g-included-side",
        "name": "Choose your included side",
        "description": "Rice and peas come with your box. Choose one extra side.",
        "selectionMode": "single",
        "minSelections": 1,
        "maxSelections": 1,
        "options": [
          {
            "id": "cabbage",
            "name": "Cabbage",
            "description": "",
            "price": 0
          },
          {
            "id": "plantain",
            "name": "Fried plantain",
            "description": "",
            "price": 0
          }
        ]
      }
    ]
  },
  {
    "_id": "m5",
    "name": "Callaloo Lunch Box",
    "category": "Lunch Boxes",
    "description": "Callaloo with seasoned cabbage, rice and peas, and fried plantain. Coming soon.",
    "price": 1500,
    "isAvailable": false,
    "categorySortOrder": 1,
    "sortOrder": 5,
    "isComingSoon": false,
    "optionGroups": [],
    "sizes": [],
    "showsStartingPrice": false
  },
  {
    "_id": "m6",
    "name": "Fried Dumplings",
    "category": "Sides",
    "description": "Golden, crisp outside and soft inside. Three per order.",
    "price": 600,
    "isAvailable": true,
    "categorySortOrder": 5,
    "sortOrder": 6,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/955d41f9-6bc3-4930-a2e5-13cbabde52d6"
  },
  {
    "_id": "m8",
    "name": "Jerk Chicken Catering Tray",
    "category": "Catering Trays",
    "description": "A party-ready tray of chopped jerk chicken.",
    "price": 8500,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/581c67a8-2ca1-4749-b329-0b90d6a028af",
    "isAvailable": true,
    "isBottleService": true,
    "categorySortOrder": 8,
    "sortOrder": 8
  },
  {
    "_id": "m9",
    "name": "Fish & Vegetable Catering Tray",
    "category": "Catering Trays",
    "description": "Seasoned fish with peppers and vegetables for group orders.",
    "price": 12000,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/f4fce86c-a128-4773-875c-d0eede63a4b4",
    "isAvailable": true,
    "isBottleService": true,
    "categorySortOrder": 8,
    "sortOrder": 9
  },
  {
    "_id": "m10",
    "name": "Soup",
    "category": "Starters",
    "description": "A hearty bowl of rich Jamaican soup, packed with vegetables, ground provisions, and dumplings.",
    "price": 500,
    "isAvailable": true,
    "categorySortOrder": 3,
    "sortOrder": 10,
    "sizes": [
      {
        "name": "Small",
        "price": 500
      },
      {
        "name": "Large",
        "price": 1000
      }
    ],
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/bae9dfec-575f-425f-b823-1e5693c59665"
  },
  {
    "_id": "m15",
    "name": "Festival",
    "category": "Sides",
    "description": "Sweet Jamaican fried dough with a golden outside and soft center.",
    "price": 500,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/eea9685b-7dfb-4d04-b96a-6d936466da5b",
    "isAvailable": true,
    "categorySortOrder": 5,
    "sortOrder": 15
  },
  {
    "_id": "m16",
    "name": "Fried Plantain",
    "category": "Sides",
    "description": "Sweet ripe plantain fried until caramelized.",
    "price": 500,
    "isAvailable": true,
    "categorySortOrder": 5,
    "sortOrder": 16,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/ee059de8-de32-4d30-9f6f-b97165a81d60"
  },
  {
    "_id": "m17",
    "name": "Strawberry Pineapple",
    "category": "Natural Drinks",
    "description": "A refreshing natural strawberry and pineapple drink.",
    "price": 1000,
    "isAvailable": true,
    "categorySortOrder": 6,
    "sortOrder": 17,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/466104b6-4401-4cae-ad45-62d80fd8721a"
  },
  {
    "_id": "m18",
    "name": "To The World",
    "category": "Natural Drinks",
    "description": "The house natural drink blend featured on our menu.",
    "price": 1000,
    "isAvailable": true,
    "categorySortOrder": 6,
    "sortOrder": 18,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/d8281e7f-8530-4ecf-9093-9e224f04d80f"
  },
  {
    "_id": "m19",
    "name": "Beetroot",
    "category": "Natural Drinks",
    "description": "A vibrant natural beetroot drink.",
    "price": 1000,
    "isAvailable": true,
    "categorySortOrder": 6,
    "sortOrder": 19,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/c01b8b26-73cc-4ddf-bdc5-eaac314b227f"
  },
  {
    "_id": "m20",
    "name": "Irish Moss",
    "category": "Natural Drinks",
    "description": "A rich, creamy Caribbean-style Irish moss drink.",
    "price": 1000,
    "isAvailable": true,
    "categorySortOrder": 6,
    "sortOrder": 20,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/946ef71e-86d5-4581-94bd-ba82672a12f7"
  },
  {
    "_id": "m21",
    "name": "Cucumber",
    "category": "Natural Drinks",
    "description": "A cool and refreshing natural cucumber drink.",
    "price": 1000,
    "isAvailable": true,
    "categorySortOrder": 6,
    "sortOrder": 21,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/d303b1ff-c9a4-4223-a291-a08c6d55cb46"
  },
  {
    "_id": "m22",
    "name": "Carrot",
    "category": "Natural Drinks",
    "description": "A smooth natural carrot drink with island flavor.",
    "price": 1000,
    "isAvailable": true,
    "categorySortOrder": 6,
    "sortOrder": 22,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/81409faf-90e0-4951-a73e-ac41a1f2bdab"
  },
  {
    "_id": "m23",
    "name": "Other Natural Drink",
    "category": "Natural Drinks",
    "description": "Ask about today's additional natural drink flavor.",
    "price": 1000,
    "isAvailable": true,
    "categorySortOrder": 6,
    "sortOrder": 23,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/0fbfa9a0-672b-413a-9ca2-0ab174f38a87"
  },
  {
    "_id": "m24",
    "name": "Jerk Pork Lunch Box",
    "category": "Lunch Boxes",
    "description": "Smoky jerk pork with rice and peas and your choice of cabbage or fried plantain.",
    "price": 1500,
    "isAvailable": true,
    "categorySortOrder": 1,
    "sortOrder": 5,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/b842b99c-468f-4278-b5fe-90ea437e24c8",
    "sizes": [],
    "showsStartingPrice": false,
    "optionGroups": [
      {
        "_id": "g-included-side",
        "name": "Choose your included side",
        "description": "Rice and peas come with your box. Choose one extra side.",
        "selectionMode": "single",
        "minSelections": 1,
        "maxSelections": 1,
        "options": [
          {
            "id": "cabbage",
            "name": "Cabbage",
            "description": "",
            "price": 0
          },
          {
            "id": "plantain",
            "name": "Fried plantain",
            "description": "",
            "price": 0
          }
        ]
      }
    ]
  },
  {
    "_id": "m25",
    "name": "Jerk Pork Catering Tray",
    "category": "Catering Trays",
    "description": "A generous tray of tender, smoky jerk pork for your whole group.",
    "price": 8500,
    "isAvailable": true,
    "isBottleService": true,
    "categorySortOrder": 8,
    "sortOrder": 10,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/f6bee9e8-92e1-47b3-9f59-c7ed360ec65e"
  },
  {
    "_id": "m26",
    "name": "Vegetarian Lunchbox",
    "category": "Lunch Boxes",
    "categorySortOrder": 1,
    "sortOrder": 6,
    "price": 1500,
    "isAvailable": true,
    "description": "A hearty vegetarian meal of seasoned cabbage, rice and peas, and fried plantain.",
    "optionGroups": [],
    "sizes": [],
    "showsStartingPrice": false,
    "imageUrl": "https://uncommon-bullfrog-641.convex.cloud/api/storage/6b339d44-cfaa-4364-a71c-559b58656c8f"
  },
  {
    "_id": "m27",
    "name": "Cabbage & Festival Meal",
    "category": "Sides",
    "categorySortOrder": 1,
    "sortOrder": 7,
    "price": 1000,
    "isAvailable": true,
    "description": "Seasoned cabbage, golden Jamaican festival, and fried plantain. A generous vegetarian meal.",
    "optionGroups": [],
    "sizes": [],
    "showsStartingPrice": false
  }
];
  const fallbackEvents = [
  {
    "_id": "e1",
    "title": "Lunch Box Pop-Up",
    "date": "2026-09-05",
    "startTime": "12:00 PM",
    "endTime": "5:00 PM",
    "description": "A sample announcement ready to replace with the next Lunch Box pop-up, special or catering date.",
    "imageUrl": "assets/images/lunch-box/garett-grilling.webp",
    "isPublished": true
  }
];
  const brandedMenuImages = {
  "Jerk Chicken Lunch Box": "assets/images/lunch-box/branded-jerk-chicken-box.webp",
  "Curry Chicken Lunch Box": "assets/images/lunch-box/branded-curry-chicken-box.webp",
  "Escovitch Fish Lunch Box": "assets/images/lunch-box/branded-escovitch-fish.webp",
  "Steamed Fish Lunch Box": "assets/images/lunch-box/branded-steamed-fish-box-v2.webp",
  "Fried Dumplings": "assets/images/lunch-box/branded-fried-dumplings-v3.webp",
  "Jerk Chicken Catering Tray": "assets/images/lunch-box/branded-jerk-chicken.webp",
  "Fish & Vegetable Catering Tray": "assets/images/lunch-box/branded-escovitch-fish.webp",
  "Soup": "assets/images/lunch-box/branded-soup-v3.webp",
  "Festival": "assets/images/lunch-box/branded-festival.webp",
  "Fried Plantain": "assets/images/lunch-box/branded-fried-plantain-v2.webp",
  "Strawberry Pineapple": "assets/images/lunch-box/drink-strawberry-pineapple-v4.jpg",
  "To The World": "assets/images/lunch-box/drink-to-the-world-v4.jpg",
  "Beetroot": "assets/images/lunch-box/drink-beetroot-v4.jpg",
  "Irish Moss": "assets/images/lunch-box/drink-irish-moss-v4.jpg",
  "Cucumber": "assets/images/lunch-box/drink-cucumber-v4.jpg",
  "Carrot": "assets/images/lunch-box/drink-carrot-v4.jpg",
  "Other Natural Drink": "assets/images/lunch-box/drink-other-natural-v4.jpg",
  "Jerk Pork Lunch Box": "assets/images/lunch-box/branded-jerk-pork-box.webp",
  "Jerk Pork Catering Tray": "assets/images/lunch-box/branded-jerk-pork-catering.webp"
};
  const applyBrandImages = (items) => items; // Live Convex records own their image URLs, including removals.
  window.LunchBoxData = { fallbackMenu, fallbackEvents, applyBrandImages };
})();
