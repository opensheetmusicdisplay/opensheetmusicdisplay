{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  buildInputs = with pkgs; [
    nodejs
    xvfb-run
  ];

  shellHook = ''
    # Use default ms-playwright cache (already has chromium-1228 installed)
    export PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS="1"

    # Set library path with ALL required dependencies for Chromium
    export LD_LIBRARY_PATH=${pkgs.lib.makeLibraryPath [
      pkgs.stdenv.cc.cc.lib
      pkgs.glib
      pkgs.gtk3
      pkgs.nss
      pkgs.nspr
      pkgs.libxkbcommon
      pkgs.at-spi2-core
      pkgs.udev
      pkgs.libX11
      pkgs.libXcomposite
      pkgs.libXdamage
      pkgs.libXext
      pkgs.libXfixes
      pkgs.libXrandr
      pkgs.mesa
      pkgs.libgbm
      pkgs.cups
      pkgs.expat
      pkgs.alsa-lib
      pkgs.fontconfig
      pkgs.freetype
      pkgs.harfbuzz
      pkgs.pango
      pkgs.cairo
      pkgs.dbus
      pkgs.gdk-pixbuf
      pkgs.libuuid
      pkgs.libpng
      pkgs.libjpeg
    ]}:$LD_LIBRARY_PATH

    # Fix DBUS environment
    export DBUS_FATAL_WARNINGS=0

    echo "Chromium environment ready"
  '';
}
