"use strict";
// react component

// Create the input graph

function update(props) {
    return function(me) {
      var g = new dagreD3.graphlib.Graph()
        .setGraph({})
        .setDefaultEdgeLabel(function() { return {}; });

      // Here we"re setting nodeclass, which is used by our custom drawNodes function
      // below.
      var i = 0;

      var dict = {};
      var visit = function (inp, k) {
        dict[inp.name] = k;
        g.setNode(k, { label: inp.name, class: "type-TOP"});
        if (inp.inputs && inp.inputs.length) {
          for (var j = 0; j < inp.inputs.length; j++) {
            if(!(inp.inputs[j].name in dict)){
              var n = ++i;
              visit(inp.inputs[j], n);
            }
            if(dict[inp.inputs[j].name] != dict[inp.name]) {
              g.setEdge(dict[inp.inputs[j].name], dict[inp.name],
                {}); //lineInterpolate: 'linear'
            }
          };
        }

      }
      visit(props.req, 0);

      // Create the renderer
      // var renderer = new dagreD3.Renderer().edgeInterpolate("linear");

      var render = new dagreD3.render();

      // render.edgeInterpolate("linear");
      // Set up an SVG group so that we can translate the final graph.
      // var svg = d3.select("svg"),
          // svgGroup = svg.append("g");

      // Run the renderer. This is what draws the final graph.
      render(me, g);

      var svgGroup = me;
      var svg = d3.select("svg");
      // Center the graph
      var xCenterOffset = (svg.attr("width") - g.graph().width) / 2;
      svgGroup.attr("transform", "translate(" + xCenterOffset + ", 20)");
      svg.attr("height", g.graph().height + 40);

        // me
        //     .attr("cx", 3 + props.r)
        //     .attr("cy", 3 + props.r)
        //     .attr("r", props.r)
        //     .attr("fill", props.color);
    };
};

var Graph = React.createClass({
    render: function() {
        return <svg width="960" height="600"></svg>;
    },
    componentDidMount: function () {
        d3.select(this.getDOMNode())
            .append("g")
            .call(update(this.props));
    },
    shouldComponentUpdate: function(props) {
        d3.select(this.getDOMNode())
            .select("g")
            .call(update(props));

        // always skip React's render step
        return false;
    }
});


var Calc = React.createClass({
  getInitialState: function() {
    return {
      recipe: localStorage.recipe,
      ips: localStorage.ips || 1,
      opts: {
        asslvl: localStorage.asslvl || "0.5",
        smeltlvl: localStorage.smeltlvl || "1",
      }
    };
  },
  changeDataLib: function(ev) {
    window.location.hash = "#"+ ev.target.value;
    window.location.reload();
  },
  calculate: function() {
    var req = window.calcRequest.call(this.state.recipe, parseFloat(this.state.ips), this.state.opts)
    this.setState({result: req})
  },
  setIPS: function(ev) {
    localStorage.ips = ev.target.value;
    this.setState({ips:ev.target.value}, this.calculate);
  },
  setRecipe: function(ev) {
    localStorage.recipe = ev.target.value;
    this.setState({recipe:ev.target.value}, this.calculate);
  },
  setOption: function(ev) {
    var state = {opts:this.state.opts};
    localStorage[ev.target.name] = ev.target.value;
    state.opts[ev.target.name] = ev.target.value;
    this.setState(state, this.calculate);
  },
  getSubtotals: function(req, subtotals) {
    if (!subtotals) {
      subtotals = {}
    }
    if (!subtotals[req.name]) {
      subtotals[req.name] = {
        name: req.name,
        ips: 0,
        ipspa: req.ipspa,
      }
    }
    var sub = subtotals[req.name];
    sub.ips += req.ips;
    sub.assemblers = sub.ips / sub.ipspa;
    if (req.inputs) {
      for (var i = req.inputs.length - 1; i >= 0; i--) {
        this.getSubtotals(req.inputs[i], subtotals);
      };
    };
    return subtotals;
  },
  getGraph: function(result) {
    return <Graph req={result} />;
  },

  render: function() {
    var result, subtotals, layout;
    if (this.state.result) {
      result = <Req req={this.state.result}/>;
      var subs = this.getSubtotals(this.state.result);
      subtotals = [];
      for (var n in subs) {
        subtotals.push(<Req req={subs[n]} />);
      }
      layout = this.getGraph(this.state.result);
    }
    var options = (
      <div className="options">
        <label>Assembler level:
          <select
            value={this.state.opts.asslvl}
            name="asslvl"
            onChange={this.setOption}>
            <option value="0.5">1 (0.5 modifier)</option>
            <option value="0.75">2 (0.75 modifier)</option>
            <option value="1.25">3 (1.25 modifier)</option>
          </select>
        </label>
        <label>Smelter level:
          <select
            value={this.state.opts.smeltlvl}
            name="smeltlvl"
            onChange={this.setOption}>
            <option value="1">Stone</option>
            <option value="2">Steel / Electric</option>
          </select>
        </label>
      </div>
    );
    return (
    	<div>
        <header>
          <div>
            Calculate the requirements for
            <input
              id="recipe"
              type="text"
              list="recipes"
              placeholder="recipe name"
              value={this.state.recipe}
              onChange={this.setRecipe}/>
            <datalist id="recipes">
              {Object.keys(this.props.recipes).map(function(recipe) {
                  return <option key={recipe}>{recipe}</option>;
                })}
            </datalist>
            producing at a rate of
            <input
              id="ips"
              type="number"
              min="0"
              step="any"
              value={this.state.ips}
              onChange={this.setIPS}/>
            item(s) / second.
          </div>
          <div className="data-source">
            <label>
              Data source:
              <select
                value={this.state.currentlib}
                onChange={this.changeDataLib}>
                {this.props.datalibs.map(function(lib){
                  return <option key={lib}>{lib}</option>;
                  })}
                </select>
            </label>
          </div>
        </header>
        {options}
        <div className="row">
          <div className="col-lg-6">
            <h2>Requirements</h2>
            {result}
          </div>
          <div className="col-lg-6">
            <h2>Sub-totals</h2>
            {subtotals}
          </div>
        </div>
        <h2>Layout</h2>
        {layout}
    </div>
    );
  }
});

var Req = React.createClass({
  render: function() {
    var inputs, details;
    if (this.props.req.inputs && this.props.req.inputs.length) {
      inputs = (
        <div className="inputs">
          {this.props.req.inputs.map(function(input){
            return <Req req={input} />;
          })}
        </div>
      );
    }
    if (this.props.req.assemblers) {
      details = [
        <div className="assemblers">
          requires
          <span className="val">{this.props.req.assemblers.toFixed(2)}</span>
          {machines_name_for(this.props.req.category)}
        </div>,
      ];
    } else {
      details = null;
    }
    return (
      <div className="req">
        <div className="name">{this.props.req.name}</div>
        <div className="data">
          <div className="ips">@
            <span className="val ips-val">{this.props.req.ips.toFixed(2)}</span>
            items/s
          </div>
          {details}
        </div>
        {inputs}
      </div>
    );
  }
});

window.renderCalc = function(recipeData) {
  ReactDOM.render(
    <Calc
      recipes={recipeData}
      datalibs={window.DATALIBS}
      currentlib={window.CURRENT_LIB}/>,
    document.getElementById('calc')
  );
}

function machines_name_for(recipe_category) {
  if (recipe_category === 'smelting') {
    return 'furnaces';
  } else if (recipe_category === 'chemistry') {
    return 'chemical plants';
  } else {
    return 'assembling machines';
  }
}

window.jsx_loaded = true
if (window.lua_loaded) {
  window.renderCalc(window.recipeData)
}
