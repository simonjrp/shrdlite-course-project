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
  from: Node;
  to: Node;
  cost: number;
}

/** A directed graph. */
interface Graph<Node> {
  /** Computes the edges that leave from a node. */
  outgoingEdges(node: Node): Edge<Node>[];
  /** A function that compares nodes. */
  compareNodes: collections.ICompareFunction<Node>;
}

/** Type that reports the result of a search. */
class SearchResult<Node> {
  /** The path (sequence of Nodes) found by the search algorithm. */
  path: Node[];
  /** The total cost of the path. */
  cost: number;
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
function aStarSearch<Node>(
  graph: Graph<Node>,
  start: Node,
  goal: (n: Node) => boolean,
  heuristics: (n: Node) => number,
  timeout: number
): SearchResult<Node> {
  var result: SearchResult<Node> = {
    path: [start],
    cost: 0
  };

    function compareCost(a: Node, b: Node): number {
        var costA: number = g.getValue(a) + heuristics(a);
        var costB: number = g.getValue(b) + heuristics(b);
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
            var result: Node[] = expandPath(parentNode);
            result.push(node);
            return result;
    }

    // Cost to get to each node form the start node
    var g: collections.Dictionary<Node,number> = new collections.Dictionary<Node, number>();

    // Set of visited (already expanded) nodes
    var visited: collections.Set<Node> = new collections.Set<Node>();

    // The current frontier
    var frontierQ: collections.PriorityQueue<Node> = new collections.PriorityQueue<Node>(compareCost);
    var frontierSet: collections.Set<Node> = new collections.Set<Node>();

    // A map with parents for each node
    var parent: collections.Dictionary<Node,Node> = new collections.Dictionary<Node, Node>();

    var startTime: number = new Date().getTime() / 1000;
    var timeElapsed: number = 0;
    var timeStamp: number = new Date().getTime() / 1000;

    // Local variables
    var current, neighbour: Node;
    var edges: Edge<Node>[];
    var oldCost, newCost: number;

    // Add the initial starting node
    g.setValue(start, 0);
    frontierQ.enqueue(start);
    frontierSet.add(start);

    while (!frontierSet.isEmpty() && timeElapsed <= timeout) {
      // Pick node with smallest f() = g() + h() value
      current = frontierQ.dequeue();

        // If we've found the goal node, return path and cost to get there
        if (goal(current)) {
            result.path = expandPath(current);
            result.cost = g.getValue(current);
            return result;
        }

        visited.add(current);

        edges = graph.outgoingEdges(current);

        for (var i: number = 0; i < edges.length; i++) {
            neighbour = edges[i].to;

            if (visited.contains(neighbour)) {
                continue;
            }

            // cost from start node to neighbour
            oldCost = g.getValue(neighbour);

            // cost from start node to neighbour via the current node
            newCost = g.getValue(current) + edges[i].cost;

            if (frontierSet.contains(neighbour) && newCost >= oldCost) 
                continue;

            parent.setValue(neighbour, current);
            g.setValue(neighbour, newCost);
            frontierQ.enqueue(neighbour);
            frontierSet.add(neighbour);
        }

        timeStamp = new Date().getTime() / 1000;
        timeElapsed = timeStamp - startTime;
    }
    return result;
}