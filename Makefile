
zip:
	zip chrome\-usage\-tracker.zip $(find . -not -path "./docs*" -not -path "./.git*" -not -path "./.idea*" -not -path "./local*" -not -name "Makefile" -not -name "README.md" -not -name ".DS_Store" -not -name "chrome\-usage\-tracker.zip")