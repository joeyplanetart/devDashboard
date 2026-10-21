// Rasterizes an SVG into transparent PNGs at the given sizes using AppKit.
// usage: swift scripts/render-icon.swift <input.svg> <output-dir> <size> [size...]
import AppKit
import Foundation

let args = CommandLine.arguments
guard args.count >= 4 else {
	fputs("usage: render-icon.swift <input.svg> <output-dir> <size...>\n", stderr)
	exit(1)
}

let svgPath = args[1]
let outDir = args[2]
let sizes = args[3...].compactMap { Int($0) }

guard let image = NSImage(contentsOfFile: svgPath) else {
	fputs("failed to load \(svgPath)\n", stderr)
	exit(2)
}

try? FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)

for size in sizes {
	guard let rep = NSBitmapImageRep(
		bitmapDataPlanes: nil,
		pixelsWide: size,
		pixelsHigh: size,
		bitsPerSample: 8,
		samplesPerPixel: 4,
		hasAlpha: true,
		isPlanar: false,
		colorSpaceName: .deviceRGB,
		bytesPerRow: 0,
		bitsPerPixel: 0
	) else {
		fputs("failed to allocate \(size)px bitmap\n", stderr)
		exit(3)
	}

	rep.size = NSSize(width: size, height: size)
	NSGraphicsContext.saveGraphicsState()
	NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
	NSGraphicsContext.current?.imageInterpolation = .high
	image.draw(
		in: NSRect(x: 0, y: 0, width: size, height: size),
		from: .zero,
		operation: .sourceOver,
		fraction: 1
	)
	NSGraphicsContext.restoreGraphicsState()

	guard let data = rep.representation(using: .png, properties: [:]) else { continue }
	try! data.write(to: URL(fileURLWithPath: "\(outDir)/icon_\(size).png"))
}
