package org.pujun.interp;

/**
 * Created by milletpu on 16/3/16.
 */

import static java.lang.Math.pow;
import static java.lang.Math.sqrt;

public class RBF_inversemultiquadric implements RBF_fn{
    double r0;

    public RBF_inversemultiquadric(){
        this(1.0);
    }

    public RBF_inversemultiquadric(final double scale){
        r0 = sqrt(scale);
    }

    public double rbf(final double r) {
        return 1./sqrt(pow(r,2)+ r0);
    }

}