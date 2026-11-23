const text = `
Aashirvaad|Whole Wheat Atta 5kg|Staples|265
Aashirvaad|Whole Wheat Atta 10kg|Staples|520
Pillsbury|Chakki Fresh Atta 5kg|Staples|255
India Gate|Basmati Rice 5kg|Staples|690
Daawat|Rozana Basmati Rice 5kg|Staples|520
Fortune|Sunlite Sunflower Oil 1L|Staples|145
Fortune|Rice Bran Oil 1L|Staples|160
Saffola|Gold Edible Oil 1L|Staples|215
Dhara|Kachi Ghani Mustard Oil 1L|Staples|185
Tata|Salt 1kg|Staples|28
Tata Sampann|Toor Dal 1kg|Staples|185
Tata Sampann|Moong Dal 1kg|Staples|165
Tata Sampann|Chana Dal 1kg|Staples|110
Fortune|Besan 1kg|Staples|105
Madhur|Sugar 1kg|Staples|55
Tata Tea|Gold 500g|Staples|290
Red Label|Tea 500g|Staples|270
Everest|Turmeric Powder 200g|Staples|78
Everest|Garam Masala 100g|Staples|92
MDH|Chana Masala 100g|Staples|88
Amul|Taaza Toned Milk 1L|Dairy & Beverages|68
Amul|Salted Butter 500g|Dairy & Beverages|285
Amul|Processed Cheese Slices 200g|Dairy & Beverages|145
Mother Dairy|Classic Dahi 400g|Dairy & Beverages|40
Coca-Cola|Soft Drink 750ml|Dairy & Beverages|40
Pepsi|Soft Drink 750ml|Dairy & Beverages|40
Thums Up|Soft Drink 2.25L|Dairy & Beverages|95
Sprite|Lime Soft Drink 2L|Dairy & Beverages|90
Maaza|Mango Drink 1.2L|Dairy & Beverages|80
Real|Fruit Power Mixed Fruit 1L|Dairy & Beverages|110
Tropicana|Orange Delight 1L|Dairy & Beverages|115
Bisleri|Mineral Water 1L|Dairy & Beverages|20
Red Bull|Energy Drink 250ml|Dairy & Beverages|125
Bru|Instant Coffee 100g|Dairy & Beverages|285
Nescafe|Classic Coffee 100g|Dairy & Beverages|345
Cadbury|Bournvita 500g|Dairy & Beverages|260
Horlicks|Classic Malt 500g|Dairy & Beverages|280
Parle|Parle-G Biscuits 800g|Snacks & Biscuits|75
Britannia|Good Day Cashew 200g|Snacks & Biscuits|50
Britannia|Marie Gold 250g|Snacks & Biscuits|40
Oreo|Vanilla Creme Biscuits 120g|Snacks & Biscuits|40
Sunfeast|Dark Fantasy Choco Fills 75g|Snacks & Biscuits|40
Maggi|2-Minute Masala Noodles 12 Pack|Snacks & Biscuits|168
Kurkure|Masala Munch 90g|Snacks & Biscuits|20
Lay's|Classic Salted 52g|Snacks & Biscuits|20
Haldiram's|Aloo Bhujia 400g|Snacks & Biscuits|110
Bingo|Mad Angles 80g|Snacks & Biscuits|20
Cadbury|Dairy Milk Silk 60g|Snacks & Biscuits|90
Kissan|Fresh Tomato Ketchup 950g|Snacks & Biscuits|150
Kissan|Mixed Fruit Jam 500g|Snacks & Biscuits|170
Nutella|Hazelnut Spread 350g|Snacks & Biscuits|420
Dabur|Honey 500g|Snacks & Biscuits|275
Quaker|Oats 1kg|Snacks & Biscuits|205
Kellogg's|Corn Flakes 475g|Snacks & Biscuits|200
Colgate|Strong Teeth Toothpaste 200g|Personal Care|105
Dove|Cream Beauty Bathing Bar 100g|Personal Care|65
Lux|Soft Touch Soap Pack of 4|Personal Care|170
Dettol|Original Soap Pack of 4|Personal Care|160
Lifebuoy|Total 10 Soap Pack of 4|Personal Care|150
Head & Shoulders|Anti-Dandruff Shampoo 340ml|Personal Care|360
Clinic Plus|Strong & Long Shampoo 340ml|Personal Care|210
Pantene|Hair Fall Control Shampoo 340ml|Personal Care|330
Parachute|Coconut Oil 500ml|Personal Care|250
Dabur|Amla Hair Oil 275ml|Personal Care|160
Nivea|Soft Light Moisturiser 200ml|Personal Care|300
Vaseline|Deep Moisture Body Lotion 400ml|Personal Care|340
Gillette|Guard Razor|Personal Care|40
Fogg|Fresh Aromatic Body Spray 120ml|Personal Care|190
Himalaya|Purifying Neem Face Wash 150ml|Personal Care|175
Surf Excel|Easy Wash Detergent 1kg|Household|135
Surf Excel|Matic Front Load 2kg|Household|450
Ariel|Matic Top Load 2kg|Household|480
Tide|Plus Jasmine & Rose 1kg|Household|115
Vim|Dishwash Gel 750ml|Household|190
Harpic|Power Plus Toilet Cleaner 1L|Household|195
Lizol|Disinfectant Floor Cleaner 975ml|Household|210
Colin|Glass Cleaner 500ml|Household|100
Comfort|After Wash Fabric Conditioner 860ml|Household|215
Good Knight|Gold Flash Refill 45ml|Household|80
All Out|Ultra Refill 45ml|Household|80
Scotch-Brite|Scrub Pad Pack of 3|Household|60
Classmate|Long Notebook 172 Pages|Stationery|65
Reynolds|Trimax Ball Pens Pack of 10|Stationery|100
Cello|Butterflow Ball Pens Pack of 10|Stationery|100
Pilot|V5 Hi-Tecpoint Pen|Stationery|70
Apsara|Platinum Pencils Pack of 10|Stationery|50
Fevicol|MR Adhesive 200g|Stationery|105
JK|Copier A4 Paper 500 Sheets|Stationery|290
3M|Post-it Notes 3x3 inch|Stationery|90
Camlin|Whiteboard Markers Pack of 4|Stationery|120
Philips|Ace Saver LED Bulb 9W|Electricals|99
Syska|LED Bulb 12W|Electricals|130
Wipro|Garnet LED Bulb 9W|Electricals|85
Havells|4+1 Socket Extension Board|Electricals|420
Duracell|Ultra AA Batteries Pack of 4|Electricals|170
Eveready|Red AAA Batteries Pack of 4|Electricals|70
boAt|BassHeads 100 Wired Earphones|Electricals|399
Ambrane|USB-C Charging Cable 1m|Electricals|199
SanDisk|Cruzer Blade 32GB Pen Drive|Electricals|400
TP-Link|TL-WR841N Wi-Fi Router|Electricals|1099
`;

const rows = text
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .map((line) => {
    const [brand, name, category, price] = line.split('|');
    return { brand, name: `${brand} ${name}`, category, price: Number(price) };
  });

const prefixes = {
  Staples: 'STP',
  'Dairy & Beverages': 'DBV',
  'Snacks & Biscuits': 'SNK',
  'Personal Care': 'PRC',
  Household: 'HHD',
  Stationery: 'STN',
  Electricals: 'ELC',
};

const supplierDefs = [
  ['Gupta Wholesale Traders', 'Staples', 'Delhi'],
  ['Bharat Grain and Pulses Co.', 'Staples', 'Indore'],
  ['Shree Dairy and Beverage Agency', 'Dairy & Beverages', 'Pune'],
  ['Metro Cold Chain Distributors', 'Dairy & Beverages', 'Gurugram'],
  ['Snackline Foods Distribution', 'Snacks & Biscuits', 'Ahmedabad'],
  ['Crunch Wholesale Mart', 'Snacks & Biscuits', 'Jaipur'],
  ['Glow Personal Care Agency', 'Personal Care', 'Mumbai'],
  ['Fresh Cart Household Supplies', 'Household', 'Lucknow'],
  ['Bharat Stationers', 'Stationery', 'Delhi'],
  ['Paper Plus Traders', 'Stationery', 'Kolkata'],
  ['Sunrise Electricals', 'Electricals', 'Bengaluru'],
  ['VoltEdge Electronics Wholesale', 'Electricals', 'Hyderabad'],
];

const firstNames = ['Aarav', 'Vivaan', 'Aditya', 'Arjun', 'Rohan', 'Karan', 'Rahul', 'Amit', 'Vikas', 'Sandeep', 'Deepak', 'Manish', 'Nitin', 'Pankaj', 'Suresh', 'Ramesh', 'Mohit', 'Yash', 'Harsh', 'Ankit', 'Priya', 'Neha', 'Anjali', 'Pooja', 'Kavita', 'Sneha', 'Riya', 'Meera', 'Sunita', 'Anita', 'Nisha', 'Divya', 'Shweta', 'Ritu', 'Swati', 'Komal', 'Isha', 'Tanvi', 'Jyoti', 'Rekha', 'Imran', 'Faisal', 'Zoya', 'Ayesha', 'Gurpreet', 'Harpreet', 'Simran', 'Jaspreet', 'Joseph', 'Thomas', 'Anil', 'Lakshmi', 'Venkat', 'Krishna', 'Ravi', 'Sanjay', 'Mahesh', 'Kiran', 'Pallavi', 'Nikhil'];

const lastNames = ['Sharma', 'Verma', 'Gupta', 'Singh', 'Yadav', 'Kumar', 'Jain', 'Agarwal', 'Mishra', 'Pandey', 'Chauhan', 'Rajput', 'Saini', 'Malik', 'Hooda', 'Dahiya', 'Khan', 'Ansari', 'Patel', 'Shah', 'Mehta', 'Desai', 'Joshi', 'Kulkarni', 'Patil', 'Reddy', 'Naidu', 'Iyer', 'Nair', 'Menon', 'Pillai', 'Das', 'Banerjee', 'Ghosh', 'Bose', 'Gill', 'Sandhu', 'Thakur', 'Bansal', 'Goyal'];

const areas = ['Sector 14', 'Model Town', 'Civil Lines', 'Gandhi Nagar', 'Shivaji Nagar', 'MG Road', 'Nehru Colony', 'Lajpat Nagar', 'Rajendra Nagar', 'Park Street', 'Indira Nagar', 'Vijay Nagar', 'Anna Nagar', 'Green Park', 'Subhash Chowk', 'Railway Road', 'Defence Colony', 'Krishna Nagar', 'Ashok Vihar', 'Tilak Nagar'];

module.exports = { rows, prefixes, supplierDefs, firstNames, lastNames, areas };
