
/**
* Util module
*
* This module contains utility functions which are used in various parts of the
* main modules, i.e., state graph and interpreter.
*
*/
module Util {

    /**
     * Takes an array of objects and groups them by the given f() function.
     * @param array The array containing data to group.
     * @param f A function that, given an object in the array, returns the property of which to group by.
     * @returns A list of all the groups.
     */
    export function groupBy(array: any, f: any) {
        var groups = {};
        array.forEach(function(o: any) {
            var group = JSON.stringify(f(o));
            (<any>groups)[group] = (<any>groups)[group] || [];
            (<any>groups)[group].push(o);
        });
        return Object.keys(groups).map(function(group) {
            return (<any>groups)[group];
        });
    }

    /**
     * Returns the cartesian product of the given array.
     * @param paramArray The array for which to create the cartesian product.
     * @returns The cartesian product (array of arrays).
     */
    export function cartProd(paramArray: any) {
        function addTo(curr: any, args: any) {
            var i: number
            var copy: any
            var rest: any = args.slice(1)
            var last: any = !rest.length
            var result: any = [];

            for (i = 0; i < args[0].length; i++) {
                copy = curr.slice();
                copy.push(args[0][i]);

                if (last) {
                    result.push(copy);

                } else {
                    result = result.concat(addTo(copy, rest));
                }
            }
            return result;
        }
        return addTo([], Array.prototype.slice.call(arguments));
    }

    /**
     * Splits the given array into n equal parts
     * @param array The array to split.
     * @param n How many times to split the array.
     * @returns Returns an array of all the sub parts (splits).
     */
    export function splitUp(arr: any, n: number) {
        var rest = arr.length % n
        var restUsed = rest
        var partLength = Math.floor(arr.length / n)
        var result: any = [];

        for (var i = 0; i < arr.length; i += partLength) {
            var end = partLength + i
            var add = false;
            if (rest !== 0 && restUsed) {
                end++;
                restUsed--;
                add = true;
            }
            result.push(arr.slice(i, end));
            if (add) {
                i++;
            }
        }
        return result;
    }

    /**
     * Takes an array and returns a new array containing only unique items.
     * @param arr The array to find unique items in.
     * @returns A list of unique elements from the given array.
     */
    export function unique(arr: any[]) {
        var uniques: any[] = [];
        var found: any = {};
        for (var i = 0; i < arr.length; i++) {
            var stringified = JSON.stringify((<any>arr)[i]);
            if ((<any>found)[stringified]) {
                continue;
            }
            uniques.push((<any>arr)[i]);
            (<any>found)[stringified] = true;
        }
        return uniques;
    }

    /**
     * Checks if the given relation between two objects is valid.
     * @param objToMove The subject of the binary relation.
     * @param destination The object that has a relation to the subject.
     * @param rel The relation between 'objToMove' and 'destination'.
     * @returns True if the relation is valid, false otherwise.
     */
    export function isValid(objToMove: Parser.Object, destination: Parser.Object,
                                                          rel: string): boolean {
        var relation: Interpreter.Rel = (<any>Interpreter.Rel)[rel];
        // "Small objects cannot support large objects."
        if (objToMove.size === "large"
              && destination.size === "small"
              && (relation === Interpreter.Rel.inside
                || relation === Interpreter.Rel.ontop)) {
            return false;
        }

        if (objToMove.form === "ball" && relation === Interpreter.Rel.under)
            return false;

        // "Balls must be in boxes or on the floor, otherwise they roll away."
        if (objToMove.form === "ball"
            && (destination.form != "box"
                && destination.form != "floor"
                && (relation === Interpreter.Rel.ontop
                  || relation === Interpreter.Rel.inside))) {
            return false;
        }

        // "Objects are “inside” boxes, but “ontop” of other objects."
        if ((destination.form === "box" && relation === Interpreter.Rel.ontop)
            || (destination.form != "box" && relation === Interpreter.Rel.inside)) {
            return false;
        }

        // "Balls cannot support anything."
        if (destination.form === "ball"
            && ((relation === Interpreter.Rel.ontop
                || relation === Interpreter.Rel.inside)
                || (relation === Interpreter.Rel.under
                    && destination.size == "small" && objToMove.size == "large"))) {
            return false;
        }

        // "Boxes cannot contain pyramids, planks or boxes of the same size."
        if (destination.form === "box"
            && relation === Interpreter.Rel.inside
            && (objToMove.form === "pyramid"
                || objToMove.form === "plank"
                || (objToMove.form === "box" )
                    && objToMove.size === destination.size)) {
            return false;
        }

        // "Small boxes cannot be supported by small bricks or pyramids."
        if (objToMove.form === "box"
              && destination.size === "small" && objToMove.size === "small"
              && relation === Interpreter.Rel.ontop
              && ( destination.form === "pyramid" || destination.form === "brick" ) ) {
            return false;
        }

        // "Large boxes cannot be supported by large pyramids."
        // We assume that this is badly formulated because a strict
        // implementation of this rule would mean that large boxes can be on top
        // of small pyramids, which doesn't make sense.
        if (objToMove.form === "box"
              && objToMove.size === "large"
              && destination.form === "pyramid")
            return false;

        // Obvious spatial law; an object cannot be right/left/etc of itself
        return objToMove !== destination;
    }
}
