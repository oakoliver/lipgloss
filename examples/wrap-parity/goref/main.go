// Reference implementation for examples/wrap-parity.ts: runs upstream lipgloss.Wrap (v2.0.6).
// Reads JSON {"in": string, "widths": [int]} on stdin; prints JSON array of lipgloss.Wrap outputs.
package main

import (
	"encoding/json"
	"os"

	"charm.land/lipgloss/v2"
)

func main() {
	var req struct {
		In     string `json:"in"`
		Widths []int  `json:"widths"`
	}
	if err := json.NewDecoder(os.Stdin).Decode(&req); err != nil {
		panic(err)
	}
	out := []string{}
	for _, w := range req.Widths {
		out = append(out, lipgloss.Wrap(req.In, w, ""))
	}
	json.NewEncoder(os.Stdout).Encode(out)
}
