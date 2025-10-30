# Benchmarks
## Instructions
1. These scripts are intended to be invoked in CI virtual machine. The CI job should be invoked manually in order to make sure that latest tag is present.
2. The CI has to have rights to push to this repo to update `benchmarks`.
3. The benchmarks are stored in `benchmarks` directory. Each file is separate release.
Inside each file is array of JSONs of the following format
```
{
  resolveDuration: number,
  compileDuration: number,
  wgslSize: number,
}
```

## TODO
- [X] add vitest - don't have to, repo will handle it itself
- [X] hardcode all previous releases
- [X] ascii-filter, fluid-with-atomics, wgsl-resolution test don't call createShaderModule
  1. wgsl-resolution should return 0 calls
  2. fluid-with-atomics is broken at v0.7.1, but fixed on main (resetGame) :(
  3. ascii-filter
- [X] rewrite benchmark.template.new from .old
- [X] test with new release v0.8.0
- [ ] fork TypeGPU repo to create CI tool
