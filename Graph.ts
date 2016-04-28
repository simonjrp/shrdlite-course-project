///<reference path="lib/collections.ts"/>
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
* @param timeout Maximum time to spend performing A\* search.
* @returns A search result, which contains the path from `start` to a node satisfying `goal` and the cost of this path.
*/


function aStarSearch<Node> (
    graph : Graph<Node>,
    start : Node,
    goal : (n:Node) => boolean,
    heuristics : (n:Node) => number,
    timeout : number
) : SearchResult<Node> {
<<<<<<< HEAD

    var current : Node;
    var closedSet : collections.Set<Node> = new collections.Set<Node>();

    var openSet : collections.Set<Node> = new collections.Set<Node>() ;
    openSet.add( start );

    var gScore  : collections.Dictionary<Node,number> = new collections.Dictionary<Node,number>();
    gScore.setValue(start, 0)

    var fScore :  collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    fScore.setValue(start, heuristics( start) )

    var cameFrom :  collections.Dictionary<Node, Node> = new collections.Dictionary<Node, Node>();

    var lowest : number ;
    var neighbor : Edge<Node>;
    var tentative_gScore : number;
    var openSetArray  : Array<Node>;

    var result : SearchResult<Node> = new SearchResult<Node>();
    result.path = new Array<Node>();
    while( openSet.isEmpty() == false )  {
        // current := the node in openSet having the lowest fScore[] value
        openSetArray = openSet.toArray();
        lowest = 0;
        for( var i : number = 0; i < openSetArray.length; ++i){
            if( fScore.containsKey( openSetArray[i] ) && fScore.getValue( openSetArray[lowest])  > fScore.getValue( openSetArray[i]) ) {
              lowest = i;
            }
        }
        current = openSetArray[lowest];

        //goal found
        if( goal( current) ) {
          result.cost = gScore.getValue( current );

          result.path.push( current)
          while (cameFrom.containsKey( current) ) {
            current = cameFrom.getValue(current)
            result.path.push(current)
          }
          result.path = result.path.reverse();
          return result;
        }

        openSet.remove(current);
        closedSet.add(current);

        for( var i : number = 0; i < graph.outgoingEdges(current).length; ++i ) {
          neighbor = graph.outgoingEdges(current)[i];
          if ( closedSet.contains( neighbor.to) ) {
              continue		// Ignore the neighbors which are already evaluated.
          }

          // The distance from start to a neighbor
          tentative_gScore = gScore.getValue(current) + neighbor.cost;

          if( !openSet.contains(neighbor.to) ) {
              openSet.add(neighbor.to)
          }
          else if( gScore.containsKey(neighbor.to) //distance is not infinity
          && tentative_gScore >= gScore.getValue(neighbor.to) ) {
              continue		// This is not a better path.
          }
          // This path is the best until now. Record it!
          cameFrom.setValue(neighbor.to, current );
          gScore.setValue(neighbor.to, tentative_gScore );
          fScore.setValue(neighbor.to, gScore.getValue(neighbor.to) + heuristics(neighbor.to) );
        } //for
    } //while
    throw new Error("#aStarSearch - No path was found");
=======
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
            return [];
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
            return result;
        }

        visited.add(current);

        var edges = graph.outgoingEdges(current);

        for (var i: number = 0; i < edges.length; i++) {
            var neighbour: Node = edges[i].to;

            if (visited.contains(neighbour)) {
                continue;
            }

            // cost from start node to neighbour
            var oldScore: number = g.getValue(neighbour);

            if (typeof (oldScore) === 'undefined')
                oldScore = Infinity;

            // cost from start node to neighbour via the current node
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

            if (!frontierContains) 
                frontier.enqueue(neighbour);
            else if (newScore >= oldScore) 
                continue;

            parent.setValue(neighbour, current);
            g.setValue(neighbour, newScore);
        }

        timeStamp = new Date().getTime();
        timeElapsed = timeStamp - startTime;
    }
    return result;
>>>>>>> 03ea54127b91e997649f2b1dceac8415bbc1b763
}


//////////////////////////////////////////////////////////////////////
// here is an example graph

interface Coordinate {
    x : number;
    y : number;
}


class GridNode {
    constructor(
        public pos : Coordinate
    ) {}

    add(delta : Coordinate) : GridNode {
        return new GridNode({
            x: this.pos.x + delta.x,
            y: this.pos.y + delta.y
        });
    }

    compareTo(other : GridNode) : number {
        return (this.pos.x - other.pos.x) || (this.pos.y - other.pos.y);
    }

    toString() : string {
        return "(" + this.pos.x + "," + this.pos.y + ")";
    }
}

/** Example Graph. */
class GridGraph implements Graph<GridNode> {
    private walls : collections.Set<GridNode>;

    constructor(
        public size : Coordinate,
        obstacles : Coordinate[]
    ) {
        this.walls = new collections.Set<GridNode>();
        for (var pos of obstacles) {
            this.walls.add(new GridNode(pos));
        }
        for (var x = -1; x <= size.x; x++) {
            this.walls.add(new GridNode({x:x, y:-1}));
            this.walls.add(new GridNode({x:x, y:size.y}));
        }
        for (var y = -1; y <= size.y; y++) {
            this.walls.add(new GridNode({x:-1, y:y}));
            this.walls.add(new GridNode({x:size.x, y:y}));
        }
    }

    outgoingEdges(node : GridNode) : Edge<GridNode>[] {
        var outgoing : Edge<GridNode>[] = [];
        for (var dx = -1; dx <= 1; dx++) {
            for (var dy = -1; dy <= 1; dy++) {
                if (! (dx == 0 && dy == 0)) {
                    var current = node.add({x:dx, y:dy});
                    if (! this.walls.contains(current)) {
                        outgoing.push({
                            from: node,
                            to: current,
                            cost: Math.sqrt(dx*dx + dy*dy)
                        });
                    }
                }
            }
        }
        return outgoing;
    }

    compareNodes(a : GridNode, b : GridNode) : number {
        return a.compareTo(b);
    }

    toString() : string {
        var borderRow = "+" + new Array(this.size.x + 1).join("--+");
        var betweenRow = "+" + new Array(this.size.x + 1).join("  +");
        var str = "\n" + borderRow + "\n";
        for (var y = this.size.y-1; y >= 0; y--) {
            str += "|";
            for (var x = 0; x < this.size.x; x++) {
                str += this.walls.contains(new GridNode({x:x,y:y})) ? "## " : "   ";
            }
            str += "|\n";
            if (y > 0) str += betweenRow + "\n";
        }
        str += borderRow + "\n";
        return str;
    }
}
