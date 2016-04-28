///<reference path="lib/collections.ts"/>
///<reference path="lib/node.d.ts"/>

/** Graph module
*
*  Types for generic A\* implementation.
*
*  *NB.* The only part of this module
*  that you should change is the `aStarSearch` function. Everything
*  else should be used as-is.
*/

/** An edge in a graph. */
class Edge<Node> {
    from : Node;
    to   : Node;
    cost : number;
}

/** A directed graph. */
interface Graph<Node> {
    /** Computes the edges that leave from a node. */
    outgoingEdges(node : Node) : Edge<Node>[];
    /** A function that compares nodes. */
    compareNodes : collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
    /** The path (sequence of Nodes) found by the search algorithm. */
    path : Node[];
    /** The total cost of the path. */
    cost : number;
}

/**
* A\* search implementation, parameterised by a `Node` type. The code
* here is just a template; you should rewrite this function
* entirely. In this template, the code produces a dummy search result
* which just picks the first possible neighbour.
*
* Note that you should not change the API (type) of this function,
* only its body.
* @param graph The graph on which to perform A\* search.
* @param start The initial node.
* @param goal A function that returns true when given a goal node. Used to determine if the algorithm has reached the goal.
* @param heuristics The heuristic function. Used to estimate the cost of reaching the goal from a given Node.
* @param timeout Maximum time (in seconds) to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/
function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {
    // A dummy search result: it just picks the first possible neighbour
    var result : SearchResult<Node> = {
        path: [start],
        cost: 0
    };

    function compareCost(a : Node, b : Node) : number {
        var costA = g.getValue(a) + heuristics(a);
        var costB = g.getValue(b) + heuristics(b);
        if (costA > costB)
            return -1
        else if (costA < costB)
            return 1
        else
            return 0
    };

    function expandPath(node: Node): Node[] {
        var parentNode: Node = parent.getValue(node);
        if (parentNode === start)
            return [start,node];
        else
            var result = expandPath(parentNode);
            result.push(node);
            return result;
    }

    // Cost to get to each node form the start node
    var g = new collections.Dictionary<Node, number>();

    var visited = new collections.Set<Node>();

    // The current frontier
    var frontier = new collections.PriorityQueue<Node>(compareCost);

    // A map with parents for each node
    var parent = new collections.Dictionary<Node, Node>();
    
    // Add the initial starting node
    frontier.enqueue(start);
    g.setValue(start, 0);

    var startTime: number = new Date().getTime();
    var timeElapsed: number = 0;
    var timeStamp: number = new Date().getTime();

    while (!frontier.isEmpty() && timeElapsed <= timeout) {
        // Pick node with smallest f() = g() + h() value
        var current: Node = frontier.dequeue();
        // If we've found the goal node, return path and cost to get there
        if (goal(current)) {
            result.path = expandPath(current);
            result.cost = g.getValue(current);
            console.log(g.getValue(current));
            return result;
        }

        var edges = graph.outgoingEdges(current);

        for (var i: number = 0; i < edges.length; i++) {
            var neighbour: Node = edges[i].to;
            var oldScore: number = g.getValue(neighbour);
            if (typeof (oldScore) === 'undefined')
                oldScore = Infinity;
            var newScore: number = g.getValue(current) + edges[i].cost;
            
            // Workaround. PriorityQueue's contains() method uses
            // the provided compare method to decide if something
            // is contained in the queue which is not the
            // indended behaviour here. Only want to use provided 
            // compare method for ordering.
            var frontierContains: boolean = false;

            frontier.forEach(e => {
                if (neighbour.toString() === e.toString()) {
                    frontierContains = true;
                }
            });

            if(frontierContains) {
                if (oldScore <= newScore) {
                    continue;
                }
            } else if(visited.contains(neighbour)) {
                if (oldScore <= newScore) {
                    continue;
                }
                visited.remove(neighbour);
                frontier.enqueue(neighbour);
            } else {
                frontier.enqueue(neighbour);
            }
            g.setValue(neighbour, newScore);
            parent.setValue(neighbour, current);
        }
        visited.add(current);
        timeStamp = new Date().getTime();
        timeElapsed = timeStamp - startTime;
    }
    console.log(result.path);
    return result;
}