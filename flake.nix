{
  description = "sutom dev shell";
  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  outputs = { self, nixpkgs }:
    let
      system = "x86_64-linux";  # ponytail: single machine; add flake-utils for multi-arch
      pkgs = import nixpkgs { inherit system; };
      # The Node major comes from .nvmrc, the pin CI and production read and
      # Renovate's Node.js group moves (#171). The match takes what
      # scripts/check-node-pins.sh takes: one version line (24, v24,
      # 24.12.0), blank lines and spaces around it, a CR at a line end. A
      # case in scripts/check-node-pins.test.ts fails when the two disagree.
      nvmrc = builtins.readFile ./.nvmrc;
      version = builtins.match "[[:space:]]*v?([0-9]+)(\\.[0-9]+){0,2}[[:space:]]*" nvmrc;
      major =
        if version == null
        then throw "flake.nix: .nvmrc holds ${builtins.toJSON nvmrc}, not one Node version such as 24 or 24.12.0"
        else builtins.head version;
    in {
      devShells.x86_64-linux.default = pkgs.mkShell {
        # No fallback to another Node: a nixpkgs without nodejs_<major> fails
        # here, naming the attribute, until `nix flake update` brings it in.
        packages = [ pkgs."nodejs_${major}" ];
      };
    };
}
