| Concept    | Responsibility |
| -------- | ------- |
|BlockDefinition | Describes how a block is generated|
|BlockRule | Modifies voxel data|
|Block | Represents generated voxel data|
|Biome | Determines which blocks and environmental parameters are used|

```
Biome
  │
  ├── Selects block types
  ├── Provides environmental parameters
  │
  ▼
Block definition
  │
  ├── Base voxel material
  ├── Dimensions
  ├── Generation rules
  │
  ▼
Base voxel generation
  │
  ▼
Refinement passes
  │
  ├── Remove voxels
  ├── Add voxels
  ├── Change voxel materials
  ├── Apply biome-dependent rules
  └── Apply randomized variation
  │
  ▼
Final voxel data
  │
  ▼
Mesh generation
```

Example:
1. Fill the entire block with dirt.
2. Replace the top layer with grass material.
3. Randomly remove some top-layer voxels.
4. Add additional voxels above the surface to create grass blades.
5. Randomly vary the grass material between several green variations.
6. Apply biome-specific rules, such as different grass colors or density.

### TODO
- configurable noise layers (now there are only 3 biome parameters and 2 * 3 for the heightmap. this can be configurable)
- editor settings -> default values/biomes for each new project
- project manager
- performance improvements