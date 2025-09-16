class FocusPortal {
    /**
     * Compiles the grades from the pasted data.
     * 
     * @param {string[]} rawGrades - Array of raw grades as strings.
     * @param {Object.<string, number>} weights - Object mapping grade keys to their weights.
     * @returns {Array.<Object.<string, any>>} Array of dicts representing compiled grades.
     */
    static compile_grades_from_paste(raw_grades, weights) {
        let grades = [];
        // Iterate through each line in raw_grades
        let i = -1;
        let last_grade_index = 0;
        while (true) {
            i += 1;
            if (i >= raw_grades.length) {
                break;
            }

            // Get the line and convert to lowercase and remove tabs
            let line = raw_grades[i].toLowerCase();
            line = line.replaceAll(/\t/g, " ");

            // Check for day of the week
            let day_found = false;
            let day_index = null;
            const daysOfWeek = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];
            for (let d of daysOfWeek) {
                if (line.includes(d)) {
                    day_found = true;
                    day_index = line.indexOf(d);
                    break;
                }
            }
            if (!day_found) {
                continue;
            }

            // Check for a grade and expanded lines
            let found_grade = false;
            let expanded_grade = null;
            for (let y = i; y > last_grade_index; y--) {
                // Format the other line
                let other_line = raw_grades[y].toLowerCase();
                other_line = other_line.replaceAll(/\t/g, " ");

                // Check if there is a "/"
                if (other_line.substring().indexOf("/") === -1) {
                    continue;
                }

                const foward_slash_index = other_line.indexOf("/");
                // Check if there is a specific symbol
                let found_symbol = false;
                for (let symbol in other_line.substring(foward_slash_index+1, foward_slash_index+3)) {
                    if (symbol in ["%", "ec", "exc", "ng"]) {
                        found_symbol = true;
                        break;
                    }
                }
                if (!found_symbol) {
                    continue;
                }

                found_grade = true;
                if (y != i) {
                    // Concatenate the lines
                    line = other_line + " " + line;
                    expanded_grade = y;
                    break;
                }
            }
            if (!found_grade) {
                continue;
            }

            // Determine the grade
            const line_split = line.split(" ");
            const forward_slash_split_index = line_split.indexOf("/");

            let min_points = null; let max_points = null;
            min_points = parseFloat(line_split[forward_slash_split_index-1]);
            max_points = parseFloat(line_split[forward_slash_split_index+1]);
            if (isNaN(max_points)) { last_grade_index = i; continue; }

            // Determine the weight category
            let found_weight = "NONE";
            let weight_index = Math.pow(10, 1000); // (Infinity) for finding the best weight index
            if (Object.keys(weights).length > 1) {
                // Weighted grade book
                const line_split_cut = line.slice(day_index, line.length).split(" ");
                for (let weight_key of Object.keys(weights)) {
                    // Find the weight key in the line
                    const weight_key_split = weight_key.toLowerCase().split(" ");
                    let found_index = find_subsequence_start_index(weight_key_split, line_split_cut);
                    if (found_index != -1 && found_index < weight_index) {
                        found_weight = weight_key;
                        weight_index = found_index;
                    }
                }
            }
            else {
                // Unweighted grade book
                found_weight = (Object.keys(weights)[0] ? Object.keys(weights)[0] : "Assignments");
            }

            // Get assignment name
            let assignment_name = "Undefined".toUpperCase();
            let name_index = expanded_grade == null ? i-1 : expanded_grade-1;
            // DUCKTAPE FIX The "No Assignment Upload thing" as a special case.
            if (raw_grades[name_index] == "No Assignment Uploading") {
                name_index = expanded_grade;
            }
            // Check if the name index is valid
            if (raw_grades[name_index]) {
                assignment_name = raw_grades[name_index];
                assignment_name = assignment_name.trim();
            }

            // Exclude from grade if necessary
            if (assignment_name.includes(" Excluded from Grade"))
            {
                assignment_name = assignment_name.replace(" Excluded from Grade", "");
                min_points = NaN;
            }

            // Append to grades
            grades.push({"name": assignment_name, "min": min_points, "max": max_points, "weight_cat": found_weight})
            last_grade_index = i;
        }

        return grades;
    }
}


class GradeCalculate {
    static calculate_grade(grades, weights) {
        // Group weights for easier calculation
        let weights_grouped = [];
        Object.keys(weights).forEach((weight_key) => {
            weights_grouped.push([weight_key, weights[weight_key], 0, 0]);
        });

        // Input grades into weights_grouped
        grades.forEach((g) => {
            weights_grouped.forEach((weight_entry) => {
                if (weight_entry[0] === g["weight_cat"]) {
                    weight_entry[2] += g["min"]; // Accumulate min points
                    weight_entry[3] += g["max"]; // Accumulate max points
                    return; // Exit forEach loop early once found
                }
            });
        });

        // Calculate the total used weight
        let used_weights = [];
        let total_used_weight = 0;
        weights_grouped.forEach((weight_entry) => {
            if (!((weight_entry[2] == 0) && (weight_entry[3] == 0))) {
                used_weights.push(weight_entry[0]); 
                total_used_weight += weight_entry[1];
            }
        });

        // Calculate the final grade
        let results = {};
        let final_grade = 0;
        weights_grouped.forEach((weight) => {
            let accommodate = false;
            if (weight[3] == 0) {
                weight[3] = 1;
                accommodate = true;
            }
            let weighted_grade = parseFloat((weight[2] / weight[3] * 100));
            results[weight[0]] = [weighted_grade, weight[2], accommodate ? 0 : weight[3]];
            final_grade += weighted_grade * (weight[1] / total_used_weight);
        });

        return [final_grade, results];
    }
}

function find_subsequence_start_index(subseq, seq) {
    /**
     * Find the starting index of subseq in seq.
     * 
     * @param {Array} subseq - The subsequence to find.
     * @param {Array} seq - The sequence in which to find the subsequence.
     * @returns {number} - The starting index of subseq in seq if found, -1 otherwise.
     */
    let seqIndex = 0;
    let startIndex = -1;

    for (let i = 0; i < subseq.length; i++) {
        let found = false;
        while (seqIndex < seq.length) {
            if (subseq[i] === seq[seqIndex]) {
                if (startIndex === -1) {
                    startIndex = seqIndex;
                }
                found = true;
                seqIndex++;
                break;
            }
            seqIndex++;
        }
        if (!found) {
            return -1;
        }
    }
    return startIndex;
}