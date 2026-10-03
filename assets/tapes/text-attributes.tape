# Render: vhs assets/tapes/text-attributes.tape (from the repo root)
Set Shell bash
Set FontSize 16
Set Width 640
Set Height 340
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type "export PS1='> ' && clear"
Enter
Show

Type "bun examples/text-attributes.ts"
Enter
Sleep 1.5s
Screenshot assets/text-attributes.png
