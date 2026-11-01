# World Generator

## Architecture

- `World` owns `WorldParams` and a `Generator`.
- `Generator` owns a `WorldMap`.
- `WorldMap` lazily creates and caches maps by their `MapGenerator` class.
- `MapGenerator` provides shared map storage (`Float32Array`), dimensions, generation tracking and regeneration.
- Maps are generated independently and on demand.
- `World` and `Generator` handle lifecycle and disposal.

## World Parameters

- `WorldParams` contains the configuration for world generation.
- Parameters are organized into dedicated parameter classes.
- `Scalar` provides configurable values using static, procedural or texture-based sources.
- Parameters support cloning for creating independent world configurations.

## Maps

- Each map is a separate `MapGenerator` implementation.
- Maps can be inspected independently using `MapInspector`.
- `LatitudeMap` is implemented, supporting axis, frequency, offset and distortion.

## Planned Terrain Generation

- `ContinentalnessMap` defines ocean, shelf, coast, lowland and inland regions.
- Independent feature masks define mountain, hill, valley and plateau distribution.
- `ElevationMap` combines continentalness-based elevation with feature profiles.
- Masks control where features occur; profiles define their height and shape.
- Biome selection will use environmental conditions rather than directly controlling terrain elevation.