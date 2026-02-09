#!/bin/bash

# Fix all remaining alert() calls in JavaScript files
# This script replaces alert() with conditional notification system calls

echo "Starting to fix all alert() calls..."

# Find all JS files with alert() and process them
find /home/ooxmichaelxoo/INTERCONNECT_project/js -name "*.js" -type f | while read -r file; do
    # Skip notification-system-unified.js as it contains intentional alert override
    if [[ "$file" == *"notification-system-unified.js" ]]; then
        continue
    fi
    
    # Check if file has uncommented alert()
    if grep -q "^[^/]*alert(" "$file"; then
        echo "Processing: $file"
        
        # Create a temporary file
        temp_file="${file}.tmp"
        
        # Process the file line by line
        while IFS= read -r line; do
            # Check if line contains alert() and is not commented
            if echo "$line" | grep -q "^[^/]*alert("; then
                # Extract the alert message
                alert_msg=$(echo "$line" | sed -n "s/.*alert(\(.*\));.*/\1/p")
                
                # Determine the notification type based on content
                if echo "$line" | grep -i -q "エラー\|失敗\|できません\|必要です"; then
                    notification_type="showError"
                elif echo "$line" | grep -i -q "成功\|完了\|しました"; then
                    notification_type="showSuccess"
                elif echo "$line" | grep -i -q "警告\|注意"; then
                    notification_type="showWarning"
                else
                    notification_type="showInfo"
                fi
                
                # Get indentation
                indent=$(echo "$line" | sed 's/[^ ].*//')
                
                # Write the replacement
                echo "${indent}// ${line}" | sed 's/^[[:space:]]*//;s/^/            /' >> "$temp_file"
                echo "${indent}if (window.${notification_type}) {" >> "$temp_file"
                echo "${indent}    ${notification_type}(${alert_msg});" >> "$temp_file"
                echo "${indent}}" >> "$temp_file"
            else
                echo "$line" >> "$temp_file"
            fi
        done < "$file"
        
        # Replace the original file
        mv "$temp_file" "$file"
        echo "  Fixed alert() calls in $file"
    fi
done

echo "Completed fixing alert() calls"

# Count remaining alert() calls
remaining=$(grep -r "^[^/]*alert(" /home/ooxmichaelxoo/INTERCONNECT_project/js --include="*.js" | grep -v "notification-system-unified.js" | wc -l)
echo "Remaining uncommented alert() calls: $remaining"