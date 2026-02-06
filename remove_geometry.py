import json
import re

print("📖 Reading GeoJSON file and removing geometry data...")

features_without_geometry = []
line_count = 0

# Read the file line by line
with open('All_India_pincode_Boundary-19312.geojson', 'r', encoding='utf-8') as f:
    for line_num, line in enumerate(f, 1):
        line_count = line_num
        
        # Look for lines that contain feature properties
        if '"properties"' in line:
            try:
                # Extract the properties object using regex
                match = re.search(r'"properties":\s*({[^}]+})', line)
                if match:
                    props_str = match.group(1)
                    props = json.loads(props_str)
                    
                    # Only keep the properties, no geometry
                    features_without_geometry.append(props)
                    
                    if line_num % 1000 == 0:
                        print(f"   Processed {line_num} lines, extracted {len(features_without_geometry)} features...")
            except Exception as e:
                print(f"   Warning: Could not parse line {line_num}: {str(e)[:50]}")
                continue

print(f"\n✅ Processed {line_count} lines")
print(f"✅ Extracted {len(features_without_geometry)} features without geometry")

# Create a new JSON structure without geometry
output_data = {
    "type": "FeatureCollection",
    "features": features_without_geometry
}

# Write to new file
output_filename = 'All_India_pincode_NO_GEOMETRY.json'
print(f"\n📝 Writing to {output_filename}...")

with open(output_filename, 'w', encoding='utf-8') as f:
    json.dump(output_data, f, indent=2, ensure_ascii=False)

print(f"✅ Created {output_filename}")

# Print file sizes
import os
original_size = os.path.getsize('All_India_pincode_Boundary-19312.geojson')
new_size = os.path.getsize(output_filename)

print(f"\n📊 File Size Comparison:")
print(f"   Original: {original_size:,} bytes ({original_size / 1024 / 1024:.2f} MB)")
print(f"   New:      {new_size:,} bytes ({new_size / 1024 / 1024:.2f} MB)")
print(f"   Saved:    {original_size - new_size:,} bytes ({(original_size - new_size) / 1024 / 1024:.2f} MB)")
print(f"   Reduction: {((original_size - new_size) / original_size * 100):.1f}%")

# Print sample data
print("\n📋 Sample Data (first 3 entries):")
for i, feature in enumerate(features_without_geometry[:3]):
    print(f"   {i+1}. Pincode: {feature.get('Pincode')}, Division: {feature.get('Division')}, Circle: {feature.get('Circle')}")
