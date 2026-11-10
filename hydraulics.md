# Hydraulics Generation Pipeline

The hydraulics system is divided into five passes. Global passes establish the river network, while local passes determine how water interacts with the generated terrain.

| Pass | Scope | Purpose |
|---|---|---|
| **1. River Source Selection** | Global | Select potential river sources using Poisson-disk sampling and approximate environmental factors such as latitude, ocean distance, temperature, and elevation. |
| **2. River Routing** | Global | Generate higher-detail terrain around selected sources, determine flow directions, trace river paths across chunks, resolve tributaries, and register the resulting river network. |
| **3. Local Drainage** | Local | Determine how terrain collects and directs water, including local drainage directions, depressions, and basins. Connect local drainage to the global river network. |
| **4. Local Erosion** | Local | Modify terrain based on water movement through riverbed erosion, bank erosion, sediment transport, deposition, and valley formation. |
| **5. Water Placement** | Local | Generate water geometry based on river width, depth, water levels, lakes, accumulated water, and flow properties. |

## Scope Separation

**Global passes**
- Establish where rivers originate.
- Establish connected river networks.
- Use approximations to avoid full-world environmental maps.

**Local passes**
- Refine water behavior using actual terrain data.
- Modify terrain through erosion.
- Generate water geometry when chunks are requested.

The global river network acts as an input to local hydraulics, ensuring consistent river paths regardless of chunk generation order.

## Pipeline

1. Global river source pass
Your proposed approach:
- Poisson-disk sample the spherical world.
- Estimate latitude, ocean distance, temperature, and elevation.
- Calculate river-source suitability.
- Select promising source chunks.
- Register the sources for further processing.
This pass uses approximations and avoids generating global maps.
2. Global river routing pass
Process the selected sources:
- Generate terrain at higher detail around the source.
- Determine the initial flow direction.
- Trace the river through neighboring chunks.
- Resolve tributaries and intersections.
- Stop at oceans, lakes, or terminal basins.
- Register river paths and metadata per chunk.
The result is a sparse global river network.
3. Local drainage pass
When a chunk is generated, determine how its terrain drains:
- Identify local drainage directions.
- Find local depressions and basins.
- Determine where water accumulates.
- Connect local drainage to the global river network.
This handles terrain details that the global routing pass deliberately ignores.
4. Local erosion pass
Modify terrain based on water movement:
- Riverbed erosion.
- Bank erosion.
- Sediment transport and deposition.
- Valley formation.
- Slope-dependent erosion.
This can operate at chunk level, using neighboring chunk data where necessary.
5. Water placement pass
Finally, calculate the actual water geometry:
- River water level.
- River width and depth.
- Lakes and accumulated water.
- Water surface connectivity.
- Flow direction and velocity, if needed.