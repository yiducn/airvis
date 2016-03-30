package org.pujun.interp;

import static java.lang.Math.exp;
import static java.lang.Math.pow;

/**
 * Created by milletpu on 16/3/16.
 * 
 */

public class RBF_gauss implements RBF_fn{
    double r0;

    public RBF_gauss(){
        this(1.0);  //default const number r0 = 1
    }

    public RBF_gauss(final double scale) {
        r0 = scale;
    }

    public double rbf(final double r) {
        return exp(-0.5 * pow(r,2)/pow(r0,2));
    }

}
