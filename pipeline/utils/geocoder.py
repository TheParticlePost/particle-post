"""
Geocoder — resolves company names to lat/lng coordinates for the Pulse map.

Strategy:
1. Check built-in lookup table of major company HQs
2. Fuzzy-match against known companies (case-insensitive, partial match)
3. Fall back to country centroid if country_code hint is provided
4. Last resort: return None (caller should handle gracefully)
"""

from __future__ import annotations

# Major company HQ coordinates (city-level precision)
# Format: { "company_lower": (lat, lng, country_code, city) }
_COMPANY_HQ: dict[str, tuple[float, float, str, str]] = {
    # Financial Services
    "jpmorgan": (40.7128, -74.006, "US", "New York"),
    "jpmorgan chase": (40.7128, -74.006, "US", "New York"),
    "goldman sachs": (40.7142, -74.0064, "US", "New York"),
    "morgan stanley": (40.7614, -73.9776, "US", "New York"),
    "bank of america": (35.2271, -80.8431, "US", "Charlotte"),
    "citigroup": (40.7205, -74.0113, "US", "New York"),
    "citi": (40.7205, -74.0113, "US", "New York"),
    "wells fargo": (37.7749, -122.4194, "US", "San Francisco"),
    "hsbc": (51.5144, -0.0803, "GB", "London"),
    "barclays": (51.5134, -0.0890, "GB", "London"),
    "deutsche bank": (50.1109, 8.6821, "DE", "Frankfurt"),
    "ubs": (47.3769, 8.5417, "CH", "Zurich"),
    "credit suisse": (47.3769, 8.5417, "CH", "Zurich"),
    "dbs bank": (1.2804, 103.8509, "SG", "Singapore"),
    "dbs": (1.2804, 103.8509, "SG", "Singapore"),
    "stripe": (37.7749, -122.4194, "US", "San Francisco"),
    "ramp": (40.7484, -73.9857, "US", "New York"),
    "klarna": (59.3293, 18.0686, "SE", "Stockholm"),
    "revolut": (51.5074, -0.1278, "GB", "London"),
    "wise": (51.5074, -0.1278, "GB", "London"),
    "nubank": (-23.5505, -46.6333, "BR", "Sao Paulo"),
    "ant group": (30.2741, 120.1551, "CN", "Hangzhou"),
    "square": (37.7749, -122.4194, "US", "San Francisco"),
    "block": (37.7749, -122.4194, "US", "San Francisco"),
    "paypal": (37.2502, -121.8614, "US", "San Jose"),
    "mastercard": (40.8965, -73.9688, "US", "New York"),
    "visa": (37.7749, -122.4194, "US", "San Francisco"),
    "adyen": (52.3676, 4.9041, "NL", "Amsterdam"),
    # Tech
    "google": (37.422, -122.084, "US", "Mountain View"),
    "alphabet": (37.422, -122.084, "US", "Mountain View"),
    "microsoft": (47.6397, -122.1282, "US", "Redmond"),
    "apple": (37.3349, -122.009, "US", "Cupertino"),
    "amazon": (47.6062, -122.3321, "US", "Seattle"),
    "aws": (47.6062, -122.3321, "US", "Seattle"),
    "meta": (37.4848, -122.1484, "US", "Menlo Park"),
    "facebook": (37.4848, -122.1484, "US", "Menlo Park"),
    "nvidia": (37.3707, -122.0375, "US", "Santa Clara"),
    "openai": (37.7749, -122.4194, "US", "San Francisco"),
    "anthropic": (37.7749, -122.4194, "US", "San Francisco"),
    "salesforce": (37.7897, -122.3969, "US", "San Francisco"),
    "oracle": (37.5294, -122.2655, "US", "Redwood City"),
    "ibm": (41.1089, -73.7203, "US", "Armonk"),
    "sap": (49.2927, 8.6432, "DE", "Walldorf"),
    "shopify": (45.4215, -75.6972, "CA", "Ottawa"),
    "palantir": (40.7580, -73.9855, "US", "New York"),
    "snowflake": (39.9311, -105.0814, "US", "Bozeman"),
    "databricks": (37.7749, -122.4194, "US", "San Francisco"),
    "servicenow": (36.1950, -115.2359, "US", "Las Vegas"),
    # Healthcare
    "nhs": (51.5074, -0.1278, "GB", "London"),
    "nhs england": (51.5074, -0.1278, "GB", "London"),
    "unitedhealth": (44.8547, -93.2422, "US", "Minnetonka"),
    "mayo clinic": (44.0225, -92.4660, "US", "Rochester"),
    "pfizer": (40.7484, -73.9857, "US", "New York"),
    "roche": (47.5596, 7.5886, "CH", "Basel"),
    "novartis": (47.5596, 7.5886, "CH", "Basel"),
    "johnson & johnson": (40.4774, -74.2591, "US", "New Brunswick"),
    # Manufacturing & Industrial
    "siemens": (48.1351, 11.582, "DE", "Munich"),
    "toyota": (35.0823, 136.983, "JP", "Toyota City"),
    "general electric": (42.3601, -71.0589, "US", "Boston"),
    "ge": (42.3601, -71.0589, "US", "Boston"),
    "boeing": (38.8951, -77.0364, "US", "Arlington"),
    "caterpillar": (40.6936, -89.5890, "US", "Peoria"),
    "3m": (44.9489, -93.1208, "US", "Saint Paul"),
    "honeywell": (35.2271, -80.8431, "US", "Charlotte"),
    "basf": (49.4875, 8.466, "DE", "Ludwigshafen"),
    "bosch": (48.7758, 9.1829, "DE", "Stuttgart"),
    "foxconn": (25.0330, 121.5654, "TW", "Taipei"),
    # Retail & E-commerce
    "walmart": (36.3729, -94.2088, "US", "Bentonville"),
    "alibaba": (30.2741, 120.1551, "CN", "Hangzhou"),
    "jd.com": (39.9042, 116.4074, "CN", "Beijing"),
    "tesco": (51.7687, -0.2232, "GB", "Welwyn"),
    "unilever": (51.5074, -0.1278, "GB", "London"),
    "nestle": (46.4615, 6.8416, "CH", "Vevey"),
    "ikea": (56.8770, 14.8060, "SE", "Almhult"),
    # Telecom
    "reliance jio": (19.076, 72.8777, "IN", "Mumbai"),
    "reliance": (19.076, 72.8777, "IN", "Mumbai"),
    "at&t": (32.7767, -96.797, "US", "Dallas"),
    "verizon": (40.7128, -74.006, "US", "New York"),
    "vodafone": (51.6553, -0.3956, "GB", "Newbury"),
    "t-mobile": (48.1351, 11.582, "DE", "Bonn"),
    # Energy
    "aramco": (26.3927, 49.9777, "SA", "Dhahran"),
    "saudi aramco": (26.3927, 49.9777, "SA", "Dhahran"),
    "shell": (51.9225, 4.4792, "NL", "The Hague"),
    "bp": (51.5074, -0.1278, "GB", "London"),
    "exxonmobil": (32.8140, -96.9489, "US", "Irving"),
    "totalenergies": (48.9073, 2.2369, "FR", "Courbevoie"),
    # Logistics
    "maersk": (55.6761, 12.5683, "DK", "Copenhagen"),
    "dhl": (50.9375, 6.9603, "DE", "Bonn"),
    "fedex": (35.1495, -90.0490, "US", "Memphis"),
    "ups": (33.7490, -84.3880, "US", "Atlanta"),
}

# Country centroid fallbacks (ISO 3166-1 alpha-2 → lat, lng)
_COUNTRY_CENTROIDS: dict[str, tuple[float, float]] = {
    "US": (39.8283, -98.5795), "GB": (55.3781, -3.4360), "DE": (51.1657, 10.4515),
    "FR": (46.2276, 2.2137), "JP": (36.2048, 138.2529), "CN": (35.8617, 104.1954),
    "IN": (20.5937, 78.9629), "CA": (56.1304, -106.3468), "AU": (-25.2744, 133.7751),
    "BR": (-14.2350, -51.9253), "KR": (35.9078, 127.7669), "SG": (1.3521, 103.8198),
    "AE": (23.4241, 53.8478), "IL": (31.0461, 34.8516), "SE": (60.1282, 18.6435),
    "NL": (52.1326, 5.2913), "CH": (46.8182, 8.2275), "SA": (23.8859, 45.0792),
    "IT": (41.8719, 12.5674), "ES": (40.4637, -3.7492), "MX": (23.6345, -102.5528),
    "ID": (-0.7893, 113.9213), "PL": (51.9194, 19.1451), "FI": (61.9241, 25.7482),
    "NO": (60.4720, 8.4689), "DK": (56.2639, 9.5018), "IE": (53.1424, -7.6921),
    "EE": (58.5953, 25.0136), "ZA": (-30.5595, 22.9375), "NG": (9.0820, 8.6753),
    "TW": (23.6978, 120.9605), "TH": (15.8700, 100.9925), "MY": (4.2105, 101.9758),
    "PH": (12.8797, 121.7740), "VN": (14.0583, 108.2772), "CL": (-35.6751, -71.543),
    "CO": (4.5709, -74.2973), "AR": (-38.4161, -63.6167), "EG": (26.8206, 30.8025),
    "KE": (-0.0236, 37.9062), "RU": (61.5240, 105.3188), "TR": (38.9637, 35.2433),
}


def geocode_company(
    company: str,
    country_code: str | None = None,
) -> dict | None:
    """
    Resolve a company name to geographic coordinates.

    Returns dict with: company, country_code, lat, lng, city
    Returns None if no match found.
    """
    if not company:
        return None

    name = company.strip().lower()

    # 1. Exact match in lookup table
    if name in _COMPANY_HQ:
        lat, lng, cc, city = _COMPANY_HQ[name]
        return {"company": company, "country_code": cc, "lat": lat, "lng": lng, "city": city}

    # 2. Fuzzy match — check if company name contains or is contained by a known key
    for key, (lat, lng, cc, city) in _COMPANY_HQ.items():
        if key in name or name in key:
            return {"company": company, "country_code": cc, "lat": lat, "lng": lng, "city": city}

    # 3. Country centroid fallback
    if country_code and country_code.upper() in _COUNTRY_CENTROIDS:
        lat, lng = _COUNTRY_CENTROIDS[country_code.upper()]
        return {"company": company, "country_code": country_code.upper(), "lat": lat, "lng": lng, "city": ""}

    return None
