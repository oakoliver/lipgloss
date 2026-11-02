//go:build ignore

// Generates tests/fixtures/colour-convert-go-v0.4.3.json: what Go's colorprofile
// (v0.4.3, with charmbracelet/x/ansi v0.11.9) converts colours and SGR
// sequences to. Run it from a scratch module that requires both, built for
// amd64 (Go on arm64 fuses `col.R*255 - 35` into an FMA and differs on a few
// hundred colours; the port follows the unfused arithmetic):
//
//	GOARCH=amd64 go run gen-colour-fixture.go > colour-convert-go-v0.4.3.json
//
// The colour sample must match sampleColors() in tests/color.test.ts.
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"image/color"
	"os"

	"github.com/charmbracelet/colorprofile"
	"github.com/charmbracelet/x/ansi"
)

func sample() []uint32 {
	var out []uint32
	for r := 0; r <= 255; r += 7 {
		for g := 0; g <= 255; g += 7 {
			for b := 0; b <= 255; b += 7 {
				out = append(out, uint32(r)<<16|uint32(g)<<8|uint32(b))
			}
		}
	}
	for v := 0; v < 256; v++ {
		out = append(out, uint32(v)<<16|uint32(v)<<8|uint32(v))
	}
	var s uint32 = 0x2545F491
	for i := 0; i < 20000; i++ {
		s = s*1664525 + 1013904223
		out = append(out, s>>8)
	}
	return out
}

func write(p colorprofile.Profile, in string) string {
	var out bytes.Buffer
	(&colorprofile.Writer{Forward: &out, Profile: p}).Write([]byte(in))
	return out.String()
}

func main() {
	var hex bytes.Buffer
	for _, c := range sample() {
		i := ansi.Convert256(color.RGBA{R: uint8(c >> 16), G: uint8(c >> 8), B: uint8(c), A: 255})
		fmt.Fprintf(&hex, "%02x", int(i))
	}
	var table []int
	for i := 0; i < 256; i++ {
		table = append(table, int(ansi.Convert16(ansi.IndexedColor(i))))
	}
	e := "\x1b["
	inputs := []string{
		e + "0m", e + "m", e + "1m", e + "0;1m", e + "1;0m", e + "1;38;2;17;34;51m",
		e + "38;2;17;34;51;48;2;1;2;3m", e + "38;5;200m", e + "48;5;200m", e + "31m", e + "91m",
		e + "38:2::17:34:51m", e + "38:5:200m", e + "38;2;300;0;0m", e + "38;5;300m",
		e + "0;38;2;1;2;3m", "a" + e + "1mb" + e + "0mc", e + "38;2;255;255;255m", e + "48;2;128;128;128m",
		e + "1;31;4m", e + "7;38;2;250;10;60m",
	}
	type wcase struct {
		Profile  string `json:"profile"`
		Input    string `json:"input"`
		Expected string `json:"expected"`
	}
	var cases []wcase
	for _, pr := range []struct {
		name string
		p    colorprofile.Profile
	}{{"ansi", colorprofile.ANSI}, {"ansi256", colorprofile.ANSI256}} {
		for _, in := range inputs {
			cases = append(cases, wcase{pr.name, in, write(pr.p, in)})
		}
	}
	json.NewEncoder(os.Stdout).Encode(map[string]any{
		"generator":  "tests/fixtures/gen-colour-fixture.go (GOARCH=amd64)",
		"count":      len(sample()),
		"convert256": hex.String(),
		"convert16":  table,
		"writer":     cases,
	})
}
