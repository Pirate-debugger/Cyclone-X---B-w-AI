import re
from typing import Dict, Any, List, Optional, Tuple

class IndiaGeographyRegistry:
    """
    India Geography Registry & Administrative Gazetteer (Sections 9, 10, 52).
    Provides structured hierarchy: COUNTRY -> STATE -> DISTRICT -> CITY/BLOCK -> ASSET.
    Supports non-Google gazetteer search across states, districts, cities, and coordinates.
    """

    COUNTRY = {
        "id": "IN",
        "name": "India",
        "iso_code": "IND",
        "bounds": [6.5, 68.0, 37.5, 97.5]
    }

    STATES: Dict[str, Dict[str, Any]] = {
        "OD": {
            "code": "OD",
            "name": "Odisha",
            "capital": "Bhubaneswar",
            "coastal": True,
            "coastline_km": 480,
            "bounds": [17.8, 81.3, 22.6, 87.5],
            "centroid": [20.95, 85.1],
            "districts": {
                "Puri": {
                    "name": "Puri",
                    "coastal": True,
                    "centroid": [19.8135, 85.8312],
                    "population": 1698730,
                    "blocks": ["Puri Sadar", "Brahmagiri", "Gop", "Kakatpur", "Nimapada", "Astaranga", "Krushnaprasad"]
                },
                "Jagatsinghpur": {
                    "name": "Jagatsinghpur",
                    "coastal": True,
                    "centroid": [20.2648, 86.1715],
                    "population": 1136971,
                    "blocks": ["Paradip", "Ersama", "Kujang", "Balikuda", "Naugaon", "Biridi"]
                },
                "Kendrapara": {
                    "name": "Kendrapara",
                    "coastal": True,
                    "centroid": [20.5034, 86.4228],
                    "population": 1440361,
                    "blocks": ["Kendrapara", "Mahakalapada", "Rajnagar", "Aul", "Pattamundai"]
                },
                "Ganjam": {
                    "name": "Ganjam",
                    "coastal": True,
                    "centroid": [19.3807, 85.0505],
                    "population": 3529031,
                    "blocks": ["Chhatrapur", "Gopalpur", "Berhampur", "Ganjam", "Chikiti"]
                },
                "Khordha": {
                    "name": "Khordha",
                    "coastal": False,
                    "centroid": [20.1809, 85.6200],
                    "population": 2251673,
                    "blocks": ["Bhubaneswar", "Khordha", "Jatni", "Banapur", "Begunia"]
                },
                "Balasore": {
                    "name": "Balasore",
                    "coastal": True,
                    "centroid": [21.4934, 86.9135],
                    "population": 2320529,
                    "blocks": ["Balasore", "Chandipur", "Bhograi", "Jaleswar", "Basta"]
                },
                "Bhadrak": {
                    "name": "Bhadrak",
                    "coastal": True,
                    "centroid": [21.0574, 86.4959],
                    "population": 1506522,
                    "blocks": ["Bhadrak", "Dhamra", "Basudevpur", "Chandbali"]
                }
            }
        },
        "WB": {
            "code": "WB",
            "name": "West Bengal",
            "capital": "Kolkata",
            "coastal": True,
            "coastline_km": 157,
            "bounds": [21.5, 85.8, 27.2, 89.9],
            "centroid": [22.98, 87.85],
            "districts": {
                "South 24 Parganas": {
                    "name": "South 24 Parganas",
                    "coastal": True,
                    "centroid": [22.1643, 88.5487],
                    "population": 8161961,
                    "blocks": ["Kakdwip", "Namkhana", "Sagar Island", "Gosaba", "Diamond Harbour", "Canning", "Basanti"]
                },
                "Purba Medinipur": {
                    "name": "Purba Medinipur",
                    "coastal": True,
                    "centroid": [21.9366, 87.7788],
                    "population": 5095875,
                    "blocks": ["Haldia", "Digha", "Contai", "Nandigram", "Tamluk", "Ramnagar"]
                },
                "North 24 Parganas": {
                    "name": "North 24 Parganas",
                    "coastal": True,
                    "centroid": [22.7196, 88.4683],
                    "population": 10009781,
                    "blocks": ["Barasat", "Basirhat", "Hingalganj", "Sandeshkhali", "Hasnabad"]
                },
                "Kolkata": {
                    "name": "Kolkata",
                    "coastal": False,
                    "centroid": [22.5726, 88.3639],
                    "population": 4496694,
                    "blocks": ["Kolkata Central", "Alipore", "Salt Lake", "Jadavpur"]
                },
                "Howrah": {
                    "name": "Howrah",
                    "coastal": False,
                    "centroid": [22.5958, 88.2636],
                    "population": 4850029,
                    "blocks": ["Howrah", "Uluberia", "Shyampur", "Bagnan"]
                }
            }
        },
        "AP": {
            "code": "AP",
            "name": "Andhra Pradesh",
            "capital": "Amaravati",
            "coastal": True,
            "coastline_km": 974,
            "bounds": [12.6, 76.7, 19.9, 84.8],
            "centroid": [15.91, 79.74],
            "districts": {
                "Visakhapatnam": {
                    "name": "Visakhapatnam",
                    "coastal": True,
                    "centroid": [17.6868, 83.2185],
                    "population": 4290589,
                    "blocks": ["Visakhapatnam Urban", "Gajuwaka", "Bheemunipatnam", "Anakapalle", "Padmanabham"]
                },
                "Srikakulam": {
                    "name": "Srikakulam",
                    "coastal": True,
                    "centroid": [18.2949, 83.8938],
                    "population": 2703114,
                    "blocks": ["Srikakulam", "Kalingapatnam", "Tekkali", "Palasa", "Sompeta"]
                },
                "Vizianagaram": {
                    "name": "Vizianagaram",
                    "coastal": True,
                    "centroid": [18.1124, 83.4072],
                    "population": 2344474,
                    "blocks": ["Vizianagaram", "Bhogapuram", "Pusapatirega"]
                },
                "East Godavari": {
                    "name": "East Godavari",
                    "coastal": True,
                    "centroid": [16.9891, 82.2475],
                    "population": 5154296,
                    "blocks": ["Kakinada", "Rajahmundry", "Amalapuram", "Razole"]
                },
                "Krishna": {
                    "name": "Krishna",
                    "coastal": True,
                    "centroid": [16.1875, 81.1389],
                    "population": 4517398,
                    "blocks": ["Machilipatnam", "Vijayawada", "Gudivada", "Nagayalanka", "Avanigadda"]
                },
                "Nellore": {
                    "name": "Nellore",
                    "coastal": True,
                    "centroid": [14.4426, 79.9865],
                    "population": 2963557,
                    "blocks": ["Nellore", "Kavali", "Gudur", "Sullurpeta", "Vakadu"]
                }
            }
        },
        "TN": {
            "code": "TN",
            "name": "Tamil Nadu",
            "capital": "Chennai",
            "coastal": True,
            "coastline_km": 1076,
            "bounds": [8.0, 76.2, 13.5, 80.3],
            "centroid": [11.12, 78.65],
            "districts": {
                "Chennai": {
                    "name": "Chennai",
                    "coastal": True,
                    "centroid": [13.0827, 80.2707],
                    "population": 7088000,
                    "blocks": ["Chennai Port", "Tondiarpet", "Mylapore", "Adyar", "Royapuram"]
                },
                "Cuddalore": {
                    "name": "Cuddalore",
                    "coastal": True,
                    "centroid": [11.7480, 79.7714],
                    "population": 2605914,
                    "blocks": ["Cuddalore", "Chidambaram", "Parangipettai", "Panruti", "Kurinjipadi"]
                },
                "Nagapattinam": {
                    "name": "Nagapattinam",
                    "coastal": True,
                    "centroid": [10.7672, 79.8449],
                    "population": 1616450,
                    "blocks": ["Nagapattinam", "Velankanni", "Vedaranyam", "Kilvelur"]
                },
                "Ramanathapuram": {
                    "name": "Ramanathapuram",
                    "coastal": True,
                    "centroid": [9.3639, 78.8395],
                    "population": 1353445,
                    "blocks": ["Rameswaram", "Ramanathapuram", "Mandapam", "Kadaladi"]
                },
                "Tiruvallur": {
                    "name": "Tiruvallur",
                    "coastal": True,
                    "centroid": [13.1438, 79.9079],
                    "population": 3728104,
                    "blocks": ["Ennore", "Ponneri", "Gummidipoondi", "Minjur"]
                }
            }
        },
        "AN": {
            "code": "AN",
            "name": "Andaman & Nicobar Islands",
            "capital": "Port Blair",
            "coastal": True,
            "coastline_km": 1912,
            "bounds": [6.7, 92.2, 13.7, 94.3],
            "centroid": [11.74, 92.65],
            "districts": {
                "South Andaman": {
                    "name": "South Andaman",
                    "coastal": True,
                    "centroid": [11.6234, 92.7265],
                    "population": 238142,
                    "blocks": ["Port Blair", "Ferrargunj", "Little Andaman"]
                },
                "North and Middle Andaman": {
                    "name": "North and Middle Andaman",
                    "coastal": True,
                    "centroid": [12.9257, 92.9298],
                    "population": 105597,
                    "blocks": ["Diglipur", "Mayabunder", "Rangat"]
                },
                "Nicobar": {
                    "name": "Nicobar",
                    "coastal": True,
                    "centroid": [9.1550, 92.7667],
                    "population": 36842,
                    "blocks": ["Car Nicobar", "Nancowry", "Great Nicobar"]
                }
            }
        },
        "GJ": {
            "code": "GJ",
            "name": "Gujarat",
            "capital": "Gandhinagar",
            "coastal": True,
            "coastline_km": 1600,
            "bounds": [20.1, 68.1, 24.7, 74.5],
            "centroid": [22.25, 71.19],
            "districts": {
                "Kutch": {
                    "name": "Kutch",
                    "coastal": True,
                    "centroid": [23.2420, 69.6669],
                    "population": 2092371,
                    "blocks": ["Kandla", "Mundra", "Mandvi", "Bhuj", "Anjar"]
                },
                "Jamnagar": {
                    "name": "Jamnagar",
                    "coastal": True,
                    "centroid": [22.4707, 70.0577],
                    "population": 2160119,
                    "blocks": ["Jamnagar", "Jodiya", "Lalpur", "Dhrol"]
                },
                "Porbandar": {
                    "name": "Porbandar",
                    "coastal": True,
                    "centroid": [21.6417, 69.6293],
                    "population": 585449,
                    "blocks": ["Porbandar", "Ranavav", "Kutiyana"]
                },
                "Junagadh": {
                    "name": "Junagadh",
                    "coastal": True,
                    "centroid": [21.5222, 70.4579],
                    "population": 2743082,
                    "blocks": ["Junagadh", "Mangrol", "Keshod", "Malia"]
                },
                "Bhavnagar": {
                    "name": "Bhavnagar",
                    "coastal": True,
                    "centroid": [21.7645, 72.1519],
                    "population": 2880365,
                    "blocks": ["Bhavnagar", "Alang", "Mahuva", "Talaja"]
                }
            }
        },
        "KL": {
            "code": "KL",
            "name": "Kerala",
            "capital": "Thiruvananthapuram",
            "coastal": True,
            "coastline_km": 590,
            "bounds": [8.3, 74.8, 12.8, 77.4],
            "centroid": [10.85, 76.27],
            "districts": {
                "Thiruvananthapuram": {
                    "name": "Thiruvananthapuram",
                    "coastal": True,
                    "centroid": [8.5241, 76.9366],
                    "population": 3301427,
                    "blocks": ["Vizhinjam", "Thiruvananthapuram", "Varkala", "Neyyattinkara"]
                },
                "Ernakulam": {
                    "name": "Ernakulam",
                    "coastal": True,
                    "centroid": [9.9816, 76.2999],
                    "population": 3282388,
                    "blocks": ["Kochi", "Aluva", "Paravur", "Kochi Port"]
                },
                "Alappuzha": {
                    "name": "Alappuzha",
                    "coastal": True,
                    "centroid": [9.4981, 76.3388],
                    "population": 2127789,
                    "blocks": ["Alappuzha", "Cherthala", "Kuttanad", "Ambalappuzha"]
                }
            }
        },
        "GA": {
            "code": "GA",
            "name": "Goa",
            "capital": "Panaji",
            "coastal": True,
            "coastline_km": 160,
            "bounds": [14.9, 73.6, 15.8, 74.4],
            "centroid": [15.29, 74.12],
            "districts": {
                "North Goa": {
                    "name": "North Goa",
                    "coastal": True,
                    "centroid": [15.4989, 73.8278],
                    "population": 818008,
                    "blocks": ["Panaji", "Bardez", "Pernem", "Bicholim"]
                },
                "South Goa": {
                    "name": "South Goa",
                    "coastal": True,
                    "centroid": [15.2736, 73.9582],
                    "population": 640537,
                    "blocks": ["Margao", "Mormugao", "Salcete", "Canacona"]
                }
            }
        }
    }

    @classmethod
    def get_states(cls) -> List[Dict[str, Any]]:
        """Returns list of supported Indian coastal states and union territories."""
        return [
            {
                "code": code,
                "name": data["name"],
                "capital": data["capital"],
                "coastal": data["coastal"],
                "coastline_km": data["coastline_km"],
                "bounds": data["bounds"],
                "centroid": data["centroid"],
                "district_count": len(data["districts"])
            }
            for code, data in cls.STATES.items()
        ]

    @classmethod
    def get_state(cls, code_or_name: str) -> Optional[Dict[str, Any]]:
        query = code_or_name.strip().upper()
        if query in cls.STATES:
            return cls.STATES[query]
        for s in cls.STATES.values():
            if s["name"].upper() == query:
                return s
        return None

    @classmethod
    def get_hierarchy(cls) -> Dict[str, Any]:
        """Returns full administrative hierarchy: Country -> States -> Districts -> Blocks."""
        return {
            "country": cls.COUNTRY,
            "states": cls.STATES
        }

    @classmethod
    def search_gazetteer(cls, query: str, state_code: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Local gazetteer search (Section 10).
        Searches states, districts, cities/blocks, and parses coordinate queries.
        Never relies on Google Geocoding.
        """
        results: List[Dict[str, Any]] = []
        q = query.strip()
        if not q:
            return results

        # 1. Check if user typed coordinates like "19.81, 85.83"
        coord_match = re.match(r"^([-+]?\d{1,2}(?:\.\d+)?)\s*,\s*([-+]?\d{1,3}(?:\.\d+)?)$", q)
        if coord_match:
            lat = float(coord_match.group(1))
            lon = float(coord_match.group(2))
            return [{
                "type": "COORDINATE",
                "name": f"Coordinate [{lat:.4f}, {lon:.4f}]",
                "lat": lat,
                "lon": lon,
                "state": "Custom Coordinate",
                "district": None,
                "source": "Local Coordinate Parser"
            }]

        q_lower = q.lower()
        states_to_search = [cls.STATES[state_code.upper()]] if state_code and state_code.upper() in cls.STATES else cls.STATES.values()

        for s in states_to_search:
            # Check state match
            if q_lower in s["name"].lower():
                results.append({
                    "type": "STATE",
                    "name": s["name"],
                    "state_code": s["code"],
                    "lat": s["centroid"][0],
                    "lon": s["centroid"][1],
                    "bounds": s["bounds"],
                    "source": "National Administrative Gazetteer"
                })

            for dist_name, dist_info in s["districts"].items():
                # Check district match
                if q_lower in dist_name.lower():
                    results.append({
                        "type": "DISTRICT",
                        "name": f"{dist_name} District",
                        "district": dist_name,
                        "state": s["name"],
                        "state_code": s["code"],
                        "lat": dist_info["centroid"][0],
                        "lon": dist_info["centroid"][1],
                        "coastal": dist_info["coastal"],
                        "population": dist_info["population"],
                        "source": "National Administrative Gazetteer"
                    })

                # Check block/city match
                for block in dist_info.get("blocks", []):
                    if q_lower in block.lower():
                        results.append({
                            "type": "BLOCK_OR_CITY",
                            "name": f"{block}, {dist_name}",
                            "block": block,
                            "district": dist_name,
                            "state": s["name"],
                            "state_code": s["code"],
                            "lat": dist_info["centroid"][0],
                            "lon": dist_info["centroid"][1],
                            "source": "National Administrative Gazetteer"
                        })

        return results[:25]
