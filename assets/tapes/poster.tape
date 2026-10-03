# Render: vhs assets/tapes/poster.tape (from the repo root)
Output assets/poster.gif

Set Shell bash
Set FontSize 14
Set Width 1180
Set Height 720
Set Padding 24
Set Theme "Catppuccin Mocha"
Set TypingSpeed 40ms

Hide
Type "export PS1='> ' && clear"
Enter
Show

Type "bun examples/poster.ts"
Sleep 400ms
Enter
Sleep 2.5s
