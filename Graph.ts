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

    var current : Node;
    var closedSet : collections.Set<Node> = new collections.Set<Node>();

    var openSet : collections.Set<Node> = new collections.Set<Node>() ;
    openSet.add( start ) //TODO NEED TO MAKE NEW TO CREATE INSTACNE OF CLASS?
    var gScore  : collections.Dictionary<Node,number> = new collections.Dictionary<Node,number>();
    gScore.setValue(start, 0)

    var fScore :  collections.Dictionary<Node, number> = new collections.Dictionary<Node, number>();
    fScore.setValue(start, heuristics( start) )

    var cameFrom :  collections.Dictionary<Node, Node> = new collections.Dictionary<Node, Node>();

    var lowest : number ;
    var neighbor : Edge<Node> = new Edge<Node>();
    var tentative_gScore : number;
    var values  : Array<Node> = new Array<Node>();


    while( openSet.isEmpty() == false )
    {
        // current := the node in openSet having the lowest fScore[] value
        values = openSet.toArray();
        lowest = -1;
        for( var i : number = 0; i < values.length; ++i)
        {
            if( lowest == -1  || values[lowest ]  > values[i]  ) {
              lowest = i;
            }
        }
        current = values[lowest];

        //goal found
        if( goal( current) ){
          var total_path : Array<Node>  = new Array<Node>();
          total_path.push( current);

          var result : SearchResult<Node> = new SearchResult<Node>();
          result.cost = gScore.getValue( current );

          while (cameFrom.containsKey( current) ) {
            current = cameFrom.getValue(current)
            total_path.push(current)
          }
          result.path = total_path;
          return result;
        }
        openSet.remove(current);
        closedSet.add(current);



        for( var i : number; i < graph.outgoingEdges(current).length; ++i )
        {
          neighbor = graph.outgoingEdges(current)[i];
          if ( closedSet.contains( neighbor.to) ) {
              continue		// Ignore the neighbors which are already evaluated.
          }


          // The distance from start to a neighbor
          tentative_gScore = gScore.getValue(current) + neighbor.cost; //TODO BUGG?? since current might not exist?

          if( !openSet.contains(neighbor.to) ) {
              openSet.add(neighbor.to)
          }
          else if( gScore.containsKey(neighbor.to)
          && tentative_gScore >= gScore.getValue(neighbor.to) )
          {
              continue		// This is not a better path.
          }
          // This path is the best until now. Record it!
          cameFrom.setValue(neighbor.to, current );
          gScore.setValue(neighbor.to, tentative_gScore );
          fScore.setValue(neighbor.to, gScore.getValue(neighbor.to) + heuristics(neighbor.to) );
        }
    }
    throw new Error("#aStarSearch - No error was found");
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
                    var next = node.add({x:dx, y:dy});
                    if (! this.walls.contains(next)) {
                        outgoing.push({
                            from: node,
                            to: next,
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
