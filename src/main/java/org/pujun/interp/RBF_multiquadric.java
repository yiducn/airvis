package org.pujun.interp;

import static java.lang.Math.pow;
import static java.lang.Math.sqrt;

/**
 * Created by milletpu on 16/3/16.
 */


public class RBF_multiquadric implements RBF_fn{
    double r0;

    public RBF_multiquadric() {
        this(1.0);
    }

    public RBF_multiquadric(final double scale){
        r0 = pow((scale),2);
    }

    public double rbf(final double r) {
        return sqrt(pow(r,2) + r0);
    }
}