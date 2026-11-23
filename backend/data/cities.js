const rows = [
  ['Delhi', 'Delhi', 28.6139, 77.209, '110', 12],
  ['Mumbai', 'Maharashtra', 19.076, 72.8777, '400', 11],
  ['Bengaluru', 'Karnataka', 12.9716, 77.5946, '560', 10],
  ['Hyderabad', 'Telangana', 17.385, 78.4867, '500', 8],
  ['Chennai', 'Tamil Nadu', 13.0827, 80.2707, '600', 7],
  ['Kolkata', 'West Bengal', 22.5726, 88.3639, '700', 7],
  ['Pune', 'Maharashtra', 18.5204, 73.8567, '411', 6],
  ['Ahmedabad', 'Gujarat', 23.0225, 72.5714, '380', 5],
  ['Jaipur', 'Rajasthan', 26.9124, 75.7873, '302', 4],
  ['Lucknow', 'Uttar Pradesh', 26.8467, 80.9462, '226', 4],
  ['Gurugram', 'Haryana', 28.4595, 77.0266, '122', 6],
  ['Noida', 'Uttar Pradesh', 28.5355, 77.391, '201', 5],
  ['Faridabad', 'Haryana', 28.4089, 77.3178, '121', 3],
  ['Sohna', 'Haryana', 28.2476, 77.0715, '122', 2],
  ['Chandigarh', 'Chandigarh', 30.7333, 76.7794, '160', 3],
  ['Bhopal', 'Madhya Pradesh', 23.2599, 77.4126, '462', 3],
  ['Indore', 'Madhya Pradesh', 22.7196, 75.8577, '452', 3],
  ['Patna', 'Bihar', 25.5941, 85.1376, '800', 3],
  ['Kochi', 'Kerala', 9.9312, 76.2673, '682', 3],
  ['Thiruvananthapuram', 'Kerala', 8.5241, 76.9366, '695', 2],
  ['Coimbatore', 'Tamil Nadu', 11.0168, 76.9558, '641', 2],
  ['Madurai', 'Tamil Nadu', 9.9252, 78.1198, '625', 2],
  ['Visakhapatnam', 'Andhra Pradesh', 17.6868, 83.2185, '530', 2],
  ['Nagpur', 'Maharashtra', 21.1458, 79.0882, '440', 3],
  ['Nashik', 'Maharashtra', 19.9975, 73.7898, '422', 2],
  ['Surat', 'Gujarat', 21.1702, 72.8311, '395', 3],
  ['Vadodara', 'Gujarat', 22.3072, 73.1812, '390', 2],
  ['Jodhpur', 'Rajasthan', 26.2389, 73.0243, '342', 2],
  ['Udaipur', 'Rajasthan', 24.5854, 73.7125, '313', 2],
  ['Kanpur', 'Uttar Pradesh', 26.4499, 80.3319, '208', 2],
  ['Varanasi', 'Uttar Pradesh', 25.3176, 82.9739, '221', 2],
  ['Agra', 'Uttar Pradesh', 27.1767, 78.0081, '282', 2],
  ['Ludhiana', 'Punjab', 30.901, 75.8573, '141', 3],
  ['Amritsar', 'Punjab', 31.634, 74.8723, '143', 2],
  ['Ambala', 'Haryana', 30.3782, 76.7767, '133', 2],
  ['Panipat', 'Haryana', 29.3909, 76.9635, '132', 2],
  ['Rohtak', 'Haryana', 28.8955, 76.6066, '124', 2],
  ['Hisar', 'Haryana', 29.1492, 75.7217, '125', 2],
  ['Bhiwani', 'Haryana', 28.7975, 76.1322, '127', 2],
  ['Dehradun', 'Uttarakhand', 30.3165, 78.0322, '248', 2],
  ['Ranchi', 'Jharkhand', 23.3441, 85.3096, '834', 2],
  ['Bhubaneswar', 'Odisha', 20.2961, 85.8245, '751', 2],
  ['Guwahati', 'Assam', 26.1445, 91.7362, '781', 2],
  ['Raipur', 'Chhattisgarh', 21.2514, 81.6296, '492', 2],
  ['Mysuru', 'Karnataka', 12.2958, 76.6394, '570', 2],
];

const cities = rows.map(([city, state, lat, lng, pin, weight]) => ({ city, state, lat, lng, pin, weight }));

const findCity = (name) => {
  const wanted = String(name || '').trim().toLowerCase();
  return cities.find((c) => c.city.toLowerCase() === wanted) || null;
};

module.exports = { cities, findCity };
